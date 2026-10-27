module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Drizzle migrations are .sql files bundled as strings (src/db/migrations/migrations.js).
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
