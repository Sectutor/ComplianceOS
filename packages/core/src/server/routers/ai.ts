
import { Router } from 'express';
import { llmService } from '../../lib/llm/service';
import { PolicyGenerator } from '../../lib/policy/policy-generation';

export const aiRouter = Router();

aiRouter.post('/generate-stream', async (req: any, res: any) => {
    try {
        console.log('[AI Stream] Request received:', {
            user: req.user?.id,
            clientId: req.body.clientId,
            templateId: req.body.templateId,
            module: req.body.module
        });

        if (!req.user) {
            console.error('[AI Stream] Unauthorized: No req.user');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { clientId, templateId, tailor, instruction, userPrompt: customUserPrompt, systemPrompt: customSystemPrompt, module: policyModule } = req.body;

        let userPrompt = customUserPrompt;
        let systemPrompt = customSystemPrompt || "You are a helpful assistant.";

        if (clientId) {
            // Structured Policy Generation Request
            const policyGenerator = new PolicyGenerator();
            console.log('[AI Stream] Using PolicyGenerator for clientId:', clientId);

            const promptData = await policyGenerator.getGenerationPrompt(clientId, templateId, req.body.sections, {
                tailorToIndustry: tailor,
                customInstruction: instruction,
                language: req.body.language
            });

            userPrompt = promptData.userPrompt;
            systemPrompt = promptData.systemPrompt;
        }

        if (!userPrompt) {
            console.error('[AI Stream] Missing userPrompt or clientId');
            return res.status(400).json({ error: 'userPrompt or clientId is required' });
        }

        // 2. Setup Headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 3. Generate Stream
        console.log('[AI Stream] Starting LLM stream...');
        const stream = llmService.generateStream({
            userPrompt,
            systemPrompt,
            feature: 'policy_generation',
            temperature: 0.7
        });

        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        console.log('[AI Stream] Stream completed successfully');

    } catch (error: any) {
        console.error('[AI Stream] ERROR:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
});
