export const PLANS = [
    {
        name: "Free",
        slug: "free",
        quota: "10",
        pagesPerPdf: 5,
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
        quota: "50",
        pagesPerPdf: 25,
        price: {
            amount: 0.10,
            priceIds: {
                test: 'price_1OTMw4DudecP078WqjAX71G3',

                // inreal deployment copy above api key down in production also
                production: ''
            },
        },
    },
]