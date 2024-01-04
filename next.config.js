/** @type {import('next').NextConfig} */
const nextConfig = {
    // for our WORKER that is needed in PDFRenderer to handle the PDF type
    webpack: (config, {buildId, dev, isServer, defaultLoaders, webpack}) => {
        config.resolve.alias.canvas = false;
        config.resolve.alias.encoding = false;
        return config;
    }
}

module.exports = nextConfig
