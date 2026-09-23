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
      async initialize() {},
      async loadProfile() {
        return readJson(profileStorageKey, null);
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

    async function rowToStrategy(row) {
      const [plant, post] = await Promise.all([
        signedUrl("strategy-media", row.plant_image_path),
        signedUrl("strategy-media", row.post_image_path)
      ]);
      return {
        id: row.id,
        map: row.map_id,
        side: row.side,
        site: row.site_id,
        floor: row.floor,
        title: row.title,
        author: row.author_name,
        authorId: row.author_id,
        operators: row.operators || [],
        steps: row.checkpoints || [],
        media: { plant, post },
        mediaPaths: { plant: row.plant_image_path || "", post: row.post_image_path || "" },
        createdAt: Date.parse(row.created_at),
        updatedAt: Date.parse(row.updated_at)
      };
    }

    async function saveStrategyRecord(record) {
      const priorPaths = record.mediaPaths || {};
      const plantPath = record.media?.plant
        ? await uploadDataUri("strategy-media", `${record.id}/plant.jpg`, record.media.plant)
        : "";
      const postPath = record.media?.post
        ? await uploadDataUri("strategy-media", `${record.id}/post.jpg`, record.media.post)
        : "";

      if (!record.media?.plant && priorPaths.plant) await removeIfPresent("strategy-media", priorPaths.plant);
      if (!record.media?.post && priorPaths.post) await removeIfPresent("strategy-media", priorPaths.post);

      const payload = {
        id: record.id,
        map_id: record.map,
        side: record.side,
        site_id: record.site,
        floor: record.floor,
        title: record.title,
        author_id: record.authorId,
        author_name: record.author,
        operators: record.operators.slice(0, 5),
        checkpoints: record.steps.slice(0, 4),
        plant_image_path: plantPath || null,
        post_image_path: postPath || null
      };
      const { data, error } = await client.from("strategies").upsert(payload).select().single();
      if (error) throw error;
      return rowToStrategy(data);
    }

    return {
      mode: "shared",
      get userId() { return user?.id || ""; },
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
        const { data, error } = await client.from("profiles").select("id, display_name, avatar_path").eq("id", user.id).maybeSingle();
        if (error) throw error;
        if (data) {
          return {
            id: data.id,
            name: data.display_name,
            photo: await signedUrl("avatars", data.avatar_path),
            photoPath: data.avatar_path || ""
          };
        }
        const localProfile = readJson(profileStorageKey, null);
        if (!localProfile?.name) return null;
        return this.saveProfile({ ...localProfile, id: user.id });
      },
      async saveProfile(profile) {
        const avatarPath = profile.photo
          ? await uploadDataUri("avatars", `${user.id}/avatar.jpg`, profile.photo)
          : "";
        if (!profile.photo && profile.photoPath) await removeIfPresent("avatars", profile.photoPath);
        const payload = { id: user.id, display_name: profile.name, avatar_path: avatarPath || null };
        const { data, error } = await client.from("profiles").upsert(payload).select().single();
        if (error) throw error;
        const saved = {
          id: data.id,
          name: data.display_name,
          photo: await signedUrl("avatars", data.avatar_path),
          photoPath: data.avatar_path || ""
        };
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
          await saveStrategyRecord({ ...record, author: profile.name, authorId: user.id });
          imported += 1;
        }
        localStorage.setItem(marker, String(imported));
        return imported;
      },
      saveStrategy: saveStrategyRecord,
      async deleteStrategy(record) {
        const { error } = await client.from("strategies").delete().eq("id", record.id);
        if (error) throw error;
        await Promise.all([
          removeIfPresent("strategy-media", record.mediaPaths?.plant),
          removeIfPresent("strategy-media", record.mediaPaths?.post)
        ]);
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
