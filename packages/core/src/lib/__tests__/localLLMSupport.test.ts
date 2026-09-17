import { describe, it, expect } from 'vitest';
import { LocalLLMDiscoveryService, localLLMDiscovery } from '../llm/localLLMDiscovery';
import { LLMService } from '../llm/service';

describe('Local LLM Support & Air-Gapped Sovereignty', () => {
  describe('LocalLLMDiscoveryService Output Cleaner', () => {
    it('should strip <think> ... </think> reasoning tags emitted by DeepSeek R1 and local reasoning models', () => {
      const rawOutput = `<think>
Analyzing NIST SP 800-53 AC-2 requirement...
Evaluating least privilege policy...
</think>
# Access Control Policy
The organization enforces least privilege across all service accounts.`;

      const cleaned = LocalLLMDiscoveryService.cleanLocalModelOutput(rawOutput);
      expect(cleaned).not.toContain('<think>');
      expect(cleaned).not.toContain('Analyzing NIST SP 800-53');
      expect(cleaned).toBe('# Access Control Policy\nThe organization enforces least privilege across all service accounts.');
    });

    it('should handle outputs without think tags without modification', () => {
      const standardOutput = 'Standard policy analysis response.';
      expect(LocalLLMDiscoveryService.cleanLocalModelOutput(standardOutput)).toBe(standardOutput);
    });

    it('should safely handle empty or null output', () => {
      expect(LocalLLMDiscoveryService.cleanLocalModelOutput('')).toBe('');
    });
  });

  describe('Recommended Local Models Catalog', () => {
    it('should provide workstation, pro workstation, and enterprise GPU tiers', () => {
      const models = LocalLLMDiscoveryService.RECOMMENDED_MODELS;
      expect(models.length).toBeGreaterThanOrEqual(10);

      const workstationModels = models.filter(m => m.tier === 'workstation');
      const proModels = models.filter(m => m.tier === 'pro_workstation');
      const enterpriseModels = models.filter(m => m.tier === 'enterprise_gpu');

      expect(workstationModels.length).toBeGreaterThan(0);
      expect(proModels.length).toBeGreaterThan(0);
      expect(enterpriseModels.length).toBeGreaterThan(0);
    });

    it('should include dedicated vector embedding models for offline RAG', () => {
      const embeddingModels = LocalLLMDiscoveryService.RECOMMENDED_MODELS.filter(m => m.supportsEmbeddings);
      expect(embeddingModels.length).toBeGreaterThanOrEqual(2);
      expect(embeddingModels.some(m => m.id === 'nomic-embed-text')).toBe(true);
      expect(embeddingModels.some(m => m.id === 'bge-large-en-v1.5')).toBe(true);
    });

    it('should include pull commands and VRAM specs for all models', () => {
      for (const m of LocalLLMDiscoveryService.RECOMMENDED_MODELS) {
        expect(m.pullCommand).toContain('ollama');
        expect(m.ramVramRequirement).toBeDefined();
        expect(m.primaryUseCase).toBeDefined();
      }
    });
  });

  describe('Local Provider Detection & Privacy Classification', () => {
    it('should identify Ollama, LM Studio, vLLM, and LocalAI as local providers', () => {
      expect(LLMService.isLocalProvider({ provider: 'ollama' })).toBe(true);
      expect(LLMService.isLocalProvider({ provider: 'lmstudio' })).toBe(true);
      expect(LLMService.isLocalProvider({ provider: 'vllm' })).toBe(true);
      expect(LLMService.isLocalProvider({ provider: 'localai' })).toBe(true);
    });

    it('should identify localhost, 127.0.0.1, and internal corporate endpoints as local', () => {
      expect(LLMService.isLocalProvider({ provider: 'custom', baseUrl: 'http://localhost:11434/v1' })).toBe(true);
      expect(LLMService.isLocalProvider({ provider: 'custom', baseUrl: 'http://127.0.0.1:1234/v1' })).toBe(true);
      expect(LLMService.isLocalProvider({ provider: 'custom', baseUrl: 'http://ai-server.corp.internal:8000/v1' })).toBe(true);
    });

    it('should identify OpenAI, Anthropic, and DeepSeek public SaaS endpoints as non-local', () => {
      expect(LLMService.isLocalProvider({ provider: 'openai' })).toBe(false);
      expect(LLMService.isLocalProvider({ provider: 'anthropic' })).toBe(false);
      expect(LLMService.isLocalProvider({ provider: 'deepseek', baseUrl: 'https://api.deepseek.com' })).toBe(false);
      expect(LLMService.isLocalProvider({ provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1' })).toBe(false);
    });
  });

  describe('Air-Gapped Sovereign Execution Mode', () => {
    it('should toggle between hybrid, local_only, and cloud_only', () => {
      LLMService.setExecutionMode('local_only');
      expect(LLMService.getExecutionMode()).toBe('local_only');

      LLMService.setExecutionMode('cloud_only');
      expect(LLMService.getExecutionMode()).toBe('cloud_only');

      LLMService.setExecutionMode('hybrid');
      expect(LLMService.getExecutionMode()).toBe('hybrid');
    });
  });
});
