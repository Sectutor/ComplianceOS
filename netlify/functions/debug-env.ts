export const handler = async (event: any) => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Environment Health Check",
            timestamp: new Date().toISOString(),
            node_version: process.version,
            env_keys: Object.keys(process.env).filter(k =>
                k.includes('URL') || k.includes('KEY') || k.includes('SECRET') || k.includes('VITE_')
            ).sort(),
            node_env: process.env.NODE_ENV,
            cwd: process.cwd()
        }, null, 2)
    };
};
