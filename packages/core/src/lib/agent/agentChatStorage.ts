/**
 * Agent Chat Persistent Storage Engine
 * Persists all multi-agent War Room and direct bot conversations into PostgreSQL
 * so chat history and multi-turn conversational context are never lost across restarts.
 */

import { getDb } from "../../db";
import { sql } from "drizzle-orm";

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole?: string;
  content: string;
  timestamp: string;
  mentions?: string[];
  delegatedTo?: string;
  attachments?: Array<{ title: string; type: string; size?: string; status?: string }>;
  browserPreview?: { url: string; title: string; steps: string[]; status: string };
  createdAt?: string;
}

export const initialSeedMessages: ChatMessage[] = [
  {
    id: "msg_wr_1",
    channelId: "war_room",
    senderId: "user",
    senderName: "You",
    senderAvatar: "👤",
    content: "@Alex and @Morgan, we need to complete the Stripe vendor risk review and verify our AWS S3 bucket encryption policy for SOC 2 Type II audit.",
    timestamp: "Yesterday, 4:15 PM",
    mentions: ["alex_tprm", "morgan_iac"]
  },
  {
    id: "msg_wr_2",
    channelId: "war_room",
    senderId: "alex_tprm",
    senderName: "Alex",
    senderAvatar: "🕵️",
    senderRole: "Vendor Trust & SOC 2 Scout",
    content: "On it! I visited the Stripe Trust Center, authenticated the session, and harvested their latest 2026 SOC 2 Type II report. Section IV reveals zero control exceptions. TPRM residual risk scored at **Low (96/100)**.\n\n↳ @Morgan, the trust report notes vendor data in AWS must enforce server-side encryption with KMS keys. Can you audit our terraform config?",
    timestamp: "Yesterday, 4:16 PM",
    delegatedTo: "morgan_iac",
    attachments: [
      { title: "Stripe_SOC2_Type_II_2026.pdf", type: "pdf", size: "14.2 MB", status: "verified" },
      { title: "TPRM_Stripe_Scorecard.json", type: "code", size: "3.4 KB", status: "applied" }
    ],
    browserPreview: {
      url: "https://trust.stripe.com",
      title: "Stripe Trust Center — SOC 2 Vault",
      steps: ["Navigated to trust portal", "Signed automated NDA", "Downloaded PDF", "Deposited in Vault"],
      status: "completed"
    }
  },
  {
    id: "msg_wr_3",
    channelId: "war_room",
    senderId: "morgan_iac",
    senderName: "Morgan",
    senderAvatar: "🛠️",
    senderRole: "Autonomous Cloud & IaC Fixer",
    content: "Thanks @Alex. I ran a continuous cloud drift scan on our AWS production environment. 3 out of 14 S3 buckets lacked default KMS encryption.\n\nI generated and tested the Terraform remediation patch in my sandbox:\n```hcl\nresource \"aws_s3_bucket_server_side_encryption_configuration\" \"compliance_enforce\" {\n  bucket = aws_s3_bucket.data_lake.id\n  rule {\n    apply_server_side_encryption_by_default {\n      sse_algorithm = \"aws:kms\"\n      kms_master_key_id = aws_kms_key.compliance_key.arn\n    }\n  }\n}\n```\nGitHub Pull Request **#42** created and ready for your approval in the Approval Inbox.",
    timestamp: "Yesterday, 4:18 PM",
    attachments: [
      { title: "PR #42: enforce-kms-s3-encryption.patch", type: "patch", size: "1.8 KB", status: "pending_approval" }
    ]
  },
  {
    id: "msg_wr_4",
    channelId: "war_room",
    senderId: "riley_evidence",
    senderName: "Riley",
    senderAvatar: "📋",
    senderRole: "Evidence Harvester & UAR Auditor",
    content: "I've linked both Alex's SOC 2 report and Morgan's Terraform PR #42 to Control **CC6.1** and **CC6.8** in Audit Hub. Cryptographic hashes logged with SHA-256.",
    timestamp: "Yesterday, 4:19 PM"
  },
  {
    id: "msg_alex_1",
    channelId: "alex_tprm",
    senderId: "user",
    senderName: "You",
    senderAvatar: "👤",
    content: "Alex, check Datadog's trust center and tell me when their next SOC 2 renewal is due.",
    timestamp: "Today, 10:00 AM"
  },
  {
    id: "msg_alex_2",
    channelId: "alex_tprm",
    senderId: "alex_tprm",
    senderName: "Alex",
    senderAvatar: "🕵️",
    senderRole: "Vendor Trust & SOC 2 Scout",
    content: "I connected to `trust.datadoghq.com` using my headless browser sandbox.\n\n* **Current Report:** Datadog SOC 2 Type II (Covering Jan 1 – Dec 31, 2025)\n* **Audit Firm:** PwC\n* **Next Audit Period Due:** Nov 2026\n* **Subservice Organizations:** AWS (Passed), GCP (Passed)\n\nI have scheduled an automated sweep for Nov 1st to pull the renewed certificate automatically.",
    timestamp: "Today, 10:01 AM",
    browserPreview: {
      url: "https://trust.datadoghq.com",
      title: "Datadog Security & Compliance Portal",
      steps: ["Connected to Trust Center", "Verified PwC Audit Certificate", "Calculated Renewal Date"],
      status: "completed"
    }
  }
];

class AgentChatStorage {
  private isTableReady = false;

  public async ensureTables(): Promise<void> {
    if (this.isTableReady) return;
    try {
      const db = await getDb();
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS agent_chat_messages (
          id VARCHAR(100) PRIMARY KEY,
          client_id INTEGER NOT NULL DEFAULT 1,
          channel_id VARCHAR(100) NOT NULL,
          sender_id VARCHAR(100) NOT NULL,
          sender_name VARCHAR(255) NOT NULL,
          sender_avatar VARCHAR(100),
          sender_role VARCHAR(255),
          content TEXT NOT NULL,
          timestamp VARCHAR(100) NOT NULL,
          mentions JSONB DEFAULT '[]'::jsonb,
          delegated_to VARCHAR(100),
          attachments JSONB DEFAULT '[]'::jsonb,
          browser_preview JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_acm_client_channel ON agent_chat_messages(client_id, channel_id, created_at ASC);
      `);
      this.isTableReady = true;
    } catch (err) {
      console.warn("[AgentChatStorage] Table creation notice:", err);
    }
  }

  public async getMessages(clientId: number, channelId: string): Promise<ChatMessage[]> {
    await this.ensureTables();
    try {
      const db = await getDb();
      const rows: any[] = await db.execute(sql`
        SELECT 
          id,
          channel_id as "channelId",
          sender_id as "senderId",
          sender_name as "senderName",
          sender_avatar as "senderAvatar",
          sender_role as "senderRole",
          content,
          timestamp,
          mentions,
          delegated_to as "delegatedTo",
          attachments,
          browser_preview as "browserPreview",
          created_at as "createdAt"
        FROM agent_chat_messages
        WHERE client_id = ${clientId} AND channel_id = ${channelId}
        ORDER BY created_at ASC
      `);

      if (rows && rows.length > 0) {
        return rows.map(r => ({
          ...r,
          mentions: Array.isArray(r.mentions) ? r.mentions : [],
          attachments: Array.isArray(r.attachments) ? r.attachments : [],
        }));
      }

      // If empty for this client/channel, seed defaults
      const defaults = initialSeedMessages.filter(m => m.channelId === channelId);
      for (const d of defaults) {
        await this.saveMessage(clientId, d);
      }
      return defaults;
    } catch (err) {
      console.warn("[AgentChatStorage] getMessages error, falling back to memory:", err);
      return initialSeedMessages.filter(m => m.channelId === channelId);
    }
  }

  public async saveMessage(clientId: number, message: ChatMessage): Promise<void> {
    await this.ensureTables();
    try {
      const db = await getDb();
      const mentionsJson = JSON.stringify(message.mentions || []);
      const attachmentsJson = JSON.stringify(message.attachments || []);
      const browserPreviewJson = message.browserPreview ? JSON.stringify(message.browserPreview) : null;

      await db.execute(sql`
        INSERT INTO agent_chat_messages (
          id, client_id, channel_id, sender_id, sender_name, sender_avatar,
          sender_role, content, timestamp, mentions, delegated_to,
          attachments, browser_preview, created_at
        ) VALUES (
          ${message.id},
          ${clientId},
          ${message.channelId},
          ${message.senderId},
          ${message.senderName},
          ${message.senderAvatar},
          ${message.senderRole || null},
          ${message.content},
          ${message.timestamp},
          ${sql.raw(`'${mentionsJson.replace(/'/g, "''")}'::jsonb`)},
          ${message.delegatedTo || null},
          ${sql.raw(`'${attachmentsJson.replace(/'/g, "''")}'::jsonb`)},
          ${browserPreviewJson ? sql.raw(`'${browserPreviewJson.replace(/'/g, "''")}'::jsonb`) : null},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          attachments = EXCLUDED.attachments,
          browser_preview = EXCLUDED.browser_preview;
      `);
    } catch (err) {
      console.warn("[AgentChatStorage] saveMessage error:", err);
    }
  }

  public async clearChannelMessages(clientId: number, channelId: string): Promise<void> {
    await this.ensureTables();
    try {
      const db = await getDb();
      await db.execute(sql`
        DELETE FROM agent_chat_messages
        WHERE client_id = ${clientId} AND channel_id = ${channelId}
      `);
    } catch (err) {
      console.warn("[AgentChatStorage] clearChannelMessages error:", err);
    }
  }

  public async listThreads(clientId: number): Promise<Array<{ channelId: string; lastMessage: string; updatedAt: string }>> {
    await this.ensureTables();
    try {
      const db = await getDb();
      const rows: any[] = await db.execute(sql`
        SELECT 
          channel_id as "channelId",
          content as "lastMessage",
          created_at as "updatedAt"
        FROM agent_chat_messages
        WHERE client_id = ${clientId}
        ORDER BY created_at DESC
      `);
      const seen = new Set<string>();
      const result: Array<{ channelId: string; lastMessage: string; updatedAt: string }> = [];
      for (const r of rows) {
        if (!seen.has(r.channelId)) {
          seen.add(r.channelId);
          result.push(r);
        }
      }
      return result;
    } catch (err) {
      return [];
    }
  }
}

export const agentChatStorage = new AgentChatStorage();
