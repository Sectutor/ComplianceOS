import { validateEnv, healthCheck, logValidationResults } from '../lib/envValidation';

async function main() {
    console.log('🔍 Validating environment configuration...\n');

    // Validate environment variables
    const envResult = validateEnv();
    logValidationResults(envResult);

    if (!envResult.valid) {
        console.error('\n❌ Environment validation failed. Please fix the errors above.');
        process.exit(1);
    }

    // Run health checks
    console.log('\n🏥 Running health checks...\n');
    try {
        const health = await healthCheck();

        console.log(`Overall Status: ${health.status === 'healthy' ? '✅' : health.status === 'degraded' ? '⚠️ ' : '❌'} ${health.status.toUpperCase()}`);
        console.log('\nService Status:');

        Object.entries(health.services).forEach(([service, status]) => {
            if (status !== undefined) {
                console.log(`  ${status ? '✅' : '❌'} ${service}`);
            }
        });

        console.log(`\n🕐 Timestamp: ${health.timestamp}`);

        if (health.status === 'unhealthy') {
            console.error('\n❌ Critical services are down. Please check your configuration.');
            process.exit(1);
        }

        console.log('\n✅ Environment validation completed successfully!');
    } catch (error) {
        console.error('\n❌ Health check failed:', error);
        process.exit(1);
    }
}

main();
