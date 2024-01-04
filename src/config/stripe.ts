export const PLANS = [
    {
        name: "Free",
        slug: "free",
        quota: "10",
        price: {
            amount: 0,
            priceIds: {
                test: '',
                production: ''
            },
        },
    },
    {
        name: "Pro",
        slug: "pro",
        quota: "25",
        price: {
            amount: 0.1,
            priceIds: {
                test: 'price_1OTMw4DudecP078WqjAX71G3',

                // inreal deployment copy above api key down in production also
                production: ''
            },
        },
    },
]