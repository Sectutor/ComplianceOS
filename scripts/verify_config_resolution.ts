
import { config } from "../lib/config";
import dotenv from 'dotenv';

console.log('Loading .env...');
dotenv.config();

console.log('Is Billing Enabled:', config.isBillingEnabled);
console.log('Stripe Key Prefix:', config.stripe.secretKey?.substring(0, 10));
console.log('Startup Monthly Price:', config.stripe.prices.startup.monthly);
console.log('Startup Yearly Price:', config.stripe.prices.startup.yearly);
console.log('Guided Monthly Price:', config.stripe.prices.guided.monthly);

if (!config.stripe.prices.startup.monthly?.startsWith('price_')) {
    console.error('ERROR: Invalid or missing Startup Monthly Price ID');
} else {
    console.log('SUCCESS: Config looks valid');
}
