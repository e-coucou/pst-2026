/** @type {import('next').NextConfig} */
const nextConfig = {
  // On injecte la version du package.json
  env: {
    APP_VERSION: require('./package.json').version,
  },
}

module.exports = nextConfig
