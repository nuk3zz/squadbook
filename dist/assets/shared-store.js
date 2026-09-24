(function () {
  "use strict";

  const profileStorageKey = "squadbook.playerProfile";
  const strategyStorageKey = "squadbook.strategies.v1";

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch (error) {
      return fallback;
    }
  }

  function dataUriToBlob(dataUri) {
    const [header, encoded] = dataUri.split(",");
    const mimeType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
    const bytes = atob(encoded);
    const output = new Uint8Array(bytes.length);
    for (let index = 0; index < bytes.length; index += 1) output[index] = bytes.charCodeAt(index);
    return new Blob([output], { type: mimeType });
  }

  function createLocalStore() {
    return {
      mode: "local",
      supportsProfileRecovery: false,
      async initialize() {},
      async loadProfile() {
        return readJson(profileStorageKey, null);
      },
      async listProfiles() {
        return [];
      },
      async claimProfile() {
        throw new Error("Profile recovery requires shared mode.");
      },
      async saveProfile(profile) {
        localStorage.setItem(profileStorageKey, JSON.stringify(profile));
        return profile;
      },
      async loadStrategies() {
        const records = readJson(strategyStorageKey, []);
        return Array.isArray(records) ? records : [];
      },
      async saveStrategy(record) {
        const records = readJson(strategyStorageKey, []);
        const next = records.some(item => item.id === record.id)
          ? records.map(item => item.id === record.id ? record : item)
          : [...records, record];
        localStorage.setItem(strategyStorageKey, JSON.stringify(next));
        return record;
      },
      async deleteStrategy(record) {
        const records = readJson(strategyStorageKey, []);
        localStorage.setItem(strategyStorageKey, JSON.stringify(records.filter(item => item.id !== record.id)));
      },
      subscribe() {
        return () => {};
      }
    };
  }

  function createSharedStore(config) {
    const client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    let user = null;
    let activeProfileId = "";

    async function signedUrl(bucket, path) {
      if (!path) return "";
      const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 86400);
      if (error) throw error;
      return data.signedUrl;
    }

    async function uploadDataUri(bucket, path, source) {
      if (!source?.startsWith("data:")) return path;
      const blob = dataUriToBlob(source);
      const { error } = await client.storage.from(bucket).upload(path, blob, {
        contentType: blob.type || "image/jpeg",
        upsert: true
      });
      if (error) throw error;
      return path;
    }

    async function removeIfPresent(bucket, path) {
      if (!path) return;
      const { error } = await client.storage.from(bucket).remove([path]);
      if (error && !/not found/i.test(error.message || "")) throw error;
    }

    async function rowToProfile(row) {
      if (!row) return null;
      return {
        id: row.id,
        name: row.display_name,
        photo: await signedUrl("avatars", row.avatar_path),
        photoPath: row.avatar_path || "",
        pinReady: Boolean(row.pin_ready)
      };
    }

    async function rowToStrategy(row) {
      const storedReferences = Array.isArray(row.visual_references) ? row.visual_references : [];
      const legacyReferences = storedReferences.length ? [] : [
        row.plant_image_path && { id: "plant", label: "Plant Spot", note: "Plant spot", path: row.plant_image_path },
        row.post_image_path && { id: "post", label: "Other", note: "Post-plant angle", path: row.post_image_path }
      ].filter(Boolean);
      const references = await Promise.all([...storedReferences, ...legacyReferences].map(async reference => ({
        id: reference.id,
        label: reference.label || "Other",
        note: reference.note || "",
        path: reference.path,
        image: await signedUrl("strategy-media", reference.path)
      })));
      return {
        id: row.id,
        map: row.map_id,
        side: row.side,
        site: row.site_id,
        floor: row.floor,
        title: row.title,
        author: row.author_name,
        authorId: row.author_id,
        editor: row.editor_name || "",
        editorId: row.editor_id || "",
        operators: row.operators || [],
        steps: row.checkpoints || [],
        references,
        createdAt: Date.parse(row.created_at),
        updatedAt: Date.parse(row.updated_at)
      };
    }

    async function saveStrategyRecord(record) {
      const priorPaths = new Set((record.previousReferences || []).map(reference => reference.path).filter(Boolean));
      const storedReferences = [];
      for (const reference of record.references || []) {
        if (!reference.image) continue;
        const path = reference.path || `${record.id}/references/${reference.id}.jpg`;
        await uploadDataUri("strategy-media", path, reference.image);
        storedReferences.push({ id: reference.id, label: reference.label || "Other", note: reference.note || "", path });
        priorPaths.delete(path);
      }
      await Promise.all([...priorPaths].map(path => removeIfPresent("strategy-media", path)));

      const payload = {
        id: record.id,
        map_id: record.map,
        side: record.side,
        site_id: record.site,
        floor: record.floor,
        title: record.title,
        author_id: record.authorId,
        author_name: record.author,
        editor_id: record.editorId || null,
        editor_name: record.editor || null,
        operators: record.operators,
        checkpoints: record.steps.slice(0, 4),
        visual_references: storedReferences,
        plant_image_path: null,
        post_image_path: null
      };
      const { data, error } = await client.from("strategies").upsert(payload).select().single();
      if (error) throw error;
      return rowToStrategy(data);
    }

    return {
      mode: "shared",
      supportsProfileRecovery: true,
      get userId() { return user?.id || ""; },
      get profileId() { return activeProfileId; },
      async initialize() {
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        user = sessionData.session?.user || null;
        if (!user) {
          const { data, error } = await client.auth.signInAnonymously();
          if (error) throw error;
          user = data.user;
        }
      },
      async loadProfile() {
        const { data, error } = await client.rpc("get_my_profile").maybeSingle();
        if (error) throw error;
        const profile = await rowToProfile(data);
        activeProfileId = profile?.id || "";
        if (profile) localStorage.setItem(profileStorageKey, JSON.stringify({ id: profile.id, name: profile.name, photo: "" }));
        return profile;
      },
      async listProfiles() {
        const { data, error } = await client.rpc("list_player_profiles");
        if (error) throw error;
        return Promise.all((data || []).map(rowToProfile));
      },
      async claimProfile(profileId, pin) {
        const { data, error } = await client.rpc("claim_player_profile", {
          p_profile_id: profileId,
          p_pin: pin
        });
        if (error) throw error;
        if (!data?.ok) {
          const failure = new Error(data?.error || "incorrect_pin");
          failure.code = data?.error || "incorrect_pin";
          throw failure;
        }
        return this.loadProfile();
      },
      async saveProfile(profile, pin = "") {
        const creating = !activeProfileId;
        if (creating) {
          const { data, error } = await client.rpc("create_player_profile", {
            p_display_name: profile.name,
            p_pin: pin
          });
          if (error) throw error;
          if (!data?.ok) {
            const failure = new Error(data?.error || "profile_create_failed");
            failure.code = data?.error || "profile_create_failed";
            throw failure;
          }
          activeProfileId = data.id;
        } else if (pin) {
          const { data, error } = await client.rpc("set_my_profile_pin", { p_pin: pin });
          if (error) throw error;
          if (!data) throw new Error("pin_update_failed");
        }

        const avatarPath = profile.photo
          ? await uploadDataUri("avatars", `${activeProfileId}/avatar.jpg`, profile.photo)
          : "";
        if (!profile.photo && profile.photoPath) await removeIfPresent("avatars", profile.photoPath);
        const { data, error } = await client
          .from("profiles")
          .update({ display_name: profile.name, avatar_path: avatarPath || null })
          .eq("id", activeProfileId)
          .select("id, display_name, avatar_path")
          .single();
        if (error) throw error;
        const saved = await rowToProfile({ ...data, pin_ready: creating || Boolean(pin) || profile.pinReady });
        localStorage.setItem(profileStorageKey, JSON.stringify({ id: saved.id, name: saved.name, photo: "" }));
        return saved;
      },
      async loadStrategies() {
        const { data, error } = await client.from("strategies").select("*").order("created_at", { ascending: true });
        if (error) throw error;
        return Promise.all((data || []).map(rowToStrategy));
      },
      async migrateLocalStrategies(profile, normalize = records => records) {
        const marker = `squadbook.sharedMigration.${config.url}`;
        if (localStorage.getItem(marker)) return 0;
        const localRecords = normalize(readJson(strategyStorageKey, []));
        if (!Array.isArray(localRecords) || !localRecords.length) {
          localStorage.setItem(marker, "empty");
          return 0;
        }
        const remoteRecords = await this.loadStrategies();
        const remoteIds = new Set(remoteRecords.map(record => record.id));
        let imported = 0;
        for (const record of localRecords) {
          if (remoteIds.has(record.id)) continue;
          await saveStrategyRecord({ ...record, author: profile.name, authorId: profile.id });
          imported += 1;
        }
        localStorage.setItem(marker, String(imported));
        return imported;
      },
      saveStrategy: saveStrategyRecord,
      async deleteStrategy(record) {
        const { error } = await client.from("strategies").delete().eq("id", record.id);
        if (error) throw error;
        await Promise.all((record.references || []).map(reference => removeIfPresent("strategy-media", reference.path)));
      },
      subscribe(onChange) {
        let timer = 0;
        const channel = client.channel("squadbook-strategy-changes")
          .on("postgres_changes", { event: "*", schema: "public", table: "strategies" }, () => {
            clearTimeout(timer);
            timer = setTimeout(onChange, 180);
          })
          .subscribe();
        return () => client.removeChannel(channel);
      }
    };
  }

  window.createSquadbookStore = function (config = {}) {
    const configured = /^https:\/\//.test(config.url || "") && Boolean(config.publishableKey);
    if (!configured || !window.supabase?.createClient) return createLocalStore();
    return createSharedStore(config);
  };
  window.createSquadbookLocalStore = createLocalStore;
})();
