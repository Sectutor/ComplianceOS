
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
});

async function main() {
    console.log('Using Key:', process.env.STRIPE_SECRET_KEY?.slice(0, 10) + '...');

    // Create Startup Product
    const startupProd = await stripe.products.create({
        name: 'ComplianceOS Startup (Test)',
    });
    const startupPriceMonth = await stripe.prices.create({
        product: startupProd.id,
        unit_amount: 4900,
        currency: 'usd',
        recurring: { interval: 'month' },
    });
    const startupPriceYear = await stripe.prices.create({
        product: startupProd.id,
        unit_amount: 49000,
        currency: 'usd',
        recurring: { interval: 'year' },
    });

    // Create Pro Product
    const proProd = await stripe.products.create({
        name: 'ComplianceOS Pro (Test)',
    });
    const proPriceMonth = await stripe.prices.create({
        product: proProd.id,
        unit_amount: 29900,
        currency: 'usd',
        recurring: { interval: 'month' },
    });
    const proPriceYear = await stripe.prices.create({
        product: proProd.id,
        unit_amount: 2990000,
        currency: 'usd',
        recurring: { interval: 'year' },
    });

    // Create Enterprise Product
    const entProd = await stripe.products.create({
        name: 'ComplianceOS Enterprise (Test)',
    });
    // Enterprise usually doesn't have a public price, but we need an ID for config
    const entPrice = await stripe.prices.create({
        product: entProd.id,
        unit_amount: 0,
        currency: 'usd',
        recurring: { interval: 'month' } // Placeholder
    });


    console.log('--- CONFIG IDS ---');
    console.log('STRIPE_PRICE_STARTUP_MONTHLY=' + startupPriceMonth.id);
    console.log('STRIPE_PRICE_STARTUP_YEARLY=' + startupPriceYear.id);
    console.log('STRIPE_PRICE_GUIDED_MONTHLY=' + proPriceMonth.id); // Guided = Pro
    console.log('STRIPE_PRICE_GUIDED_YEARLY=' + proPriceYear.id);
    console.log('STRIPE_PRICE_MANAGED=' + entPrice.id);
}

main().catch(console.error);
