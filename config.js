export default {
  upload: {
    port: 3000,
    bind: "0.0.0.0",
    tmpDir: "tmp"
  },

  ui: {
    port: 3001,
    bind: "0.0.0.0",
    publicDir: "public"
  },

  data: {
    talkgroupsCsv: "talkgroups.csv",
    database: "./stats.db"
  },

  notify: {
    enabled: true 
  }
};
