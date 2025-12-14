export default {
  upload: {
    port: 4000,
    bind: "0.0.0.0",
    tmpDir: "tmp"
  },

  ui: {
    port: 4001,
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
