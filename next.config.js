/** @type {import('next').NextConfig} */

const nextConfig = {
    // IMP: kindAuth: sign in, sign out do exist but in kingAuth in api/auth
    async redirects() {
        // creating our redirects
        return [
            {
                source: '/sign-in',
                destination: '/api/auth/login',
                permanent: true,
            },
            {
                source: '/sign-up',
                destination: '/api/auth/register',
                permanent: true,
            },
        ]
    },

    // for our WORKER that is needed in PDFRenderer to handle the PDF type
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
        config.resolve.alias.canvas = false;
        config.resolve.alias.encoding = false;
        return config;
    },
    images: {
        domains: [
            "res.cloudinary.com",
            "avatars.githubusercontent.com",
            "lh3.googleusercontent.com"
        ]
    },

}

module.exports = nextConfig
