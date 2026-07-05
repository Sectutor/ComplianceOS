--
-- PostgreSQL database dump
--

\restrict UxCZ7ZuSzzLjiwbb0Jw16aQqD4SpV5ZL9VedrLYMlDyOzS4UQ9AxH3JU7Vo0La4

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10 (Debian 17.10-1.pgdg12+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: ai_risk_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ai_risk_level AS ENUM (
    'low',
    'medium',
    'high',
    'critical',
    'unacceptable'
);


--
-- Name: ai_system_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ai_system_status AS ENUM (
    'evaluation',
    'development',
    'production',
    'monitoring',
    'retired'
);


--
-- Name: approval_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: asset_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.asset_status AS ENUM (
    'active',
    'archived',
    'disposed'
);


--
-- Name: chatvisibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.chatvisibility AS ENUM (
    'PRIVATE',
    'SEARCH_SPACE'
);


--
-- Name: client_control_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.client_control_status AS ENUM (
    'not_implemented',
    'in_progress',
    'implemented',
    'not_applicable'
);


--
-- Name: cloud_provider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cloud_provider AS ENUM (
    'aws',
    'azure',
    'gcp'
);


--
-- Name: consent_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.consent_status AS ENUM (
    'active',
    'withdrawn',
    'expired',
    'revoked'
);


--
-- Name: consent_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.consent_type AS ENUM (
    'marketing',
    'analytics',
    'functional',
    'third_party',
    'cookie'
);


--
-- Name: control_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.control_status AS ENUM (
    'active',
    'inactive',
    'draft'
);


--
-- Name: crm_deal_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.crm_deal_stage AS ENUM (
    'lead',
    'discovery',
    'proposal',
    'negotiation',
    'closed_won',
    'closed_lost'
);


--
-- Name: crm_engagement_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.crm_engagement_stage AS ENUM (
    'planned',
    'gap_analysis',
    'remediation',
    'audit_prep',
    'audit_active',
    'certified',
    'maintenance'
);


--
-- Name: data_breach_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.data_breach_status AS ENUM (
    'open',
    'investigating',
    'closed',
    'reported'
);


--
-- Name: documenttype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.documenttype AS ENUM (
    'EXTENSION',
    'CRAWLED_URL',
    'FILE',
    'SLACK_CONNECTOR',
    'TEAMS_CONNECTOR',
    'NOTION_CONNECTOR',
    'YOUTUBE_VIDEO',
    'GITHUB_CONNECTOR',
    'LINEAR_CONNECTOR',
    'DISCORD_CONNECTOR',
    'JIRA_CONNECTOR',
    'CONFLUENCE_CONNECTOR',
    'CLICKUP_CONNECTOR',
    'GOOGLE_CALENDAR_CONNECTOR',
    'GOOGLE_GMAIL_CONNECTOR',
    'GOOGLE_DRIVE_FILE',
    'AIRTABLE_CONNECTOR',
    'LUMA_CONNECTOR',
    'ELASTICSEARCH_CONNECTOR',
    'BOOKSTACK_CONNECTOR',
    'CIRCLEBACK',
    'NOTE'
);


--
-- Name: dpia_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dpia_status AS ENUM (
    'draft',
    'in_progress',
    'under_review',
    'completed'
);


--
-- Name: escalation_trigger; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.escalation_trigger AS ENUM (
    'overdue',
    'risk_threshold_breach',
    'approval_rejected',
    'status_regression',
    'missing_evidence',
    'missing_raci'
);


--
-- Name: evidence_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.evidence_status AS ENUM (
    'pending',
    'collected',
    'verified',
    'expired',
    'not_applicable',
    'rejected'
);


--
-- Name: finding_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.finding_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


--
-- Name: finding_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.finding_status AS ENUM (
    'open',
    'remediated',
    'accepted',
    'closed'
);


--
-- Name: governance_entity_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.governance_entity_type AS ENUM (
    'policy',
    'control',
    'risk',
    'bcp_plan',
    'vendor',
    'evidence',
    'task',
    'roadmap',
    'implementation_plan'
);


--
-- Name: implementation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.implementation_status AS ENUM (
    'not_started',
    'planning',
    'in_progress',
    'testing',
    'completed',
    'blocked'
);


--
-- Name: incident_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


--
-- Name: incident_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_status AS ENUM (
    'open',
    'investigating',
    'mitigated',
    'resolved',
    'reported',
    'final_report_sent',
    'closed'
);


--
-- Name: international_transfer_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.international_transfer_status AS ENUM (
    'pending',
    'active',
    'expired',
    'risk_flagged'
);


--
-- Name: kanban_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.kanban_status AS ENUM (
    'todo',
    'in_progress',
    'review',
    'done',
    'backlog'
);


--
-- Name: litellmprovider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.litellmprovider AS ENUM (
    'OPENAI',
    'ANTHROPIC',
    'GOOGLE',
    'AZURE_OPENAI',
    'BEDROCK',
    'VERTEX_AI',
    'GROQ',
    'COHERE',
    'MISTRAL',
    'DEEPSEEK',
    'XAI',
    'OPENROUTER',
    'TOGETHER_AI',
    'FIREWORKS_AI',
    'REPLICATE',
    'PERPLEXITY',
    'OLLAMA',
    'ALIBABA_QWEN',
    'MOONSHOT',
    'ZHIPU',
    'ANYSCALE',
    'DEEPINFRA',
    'CEREBRAS',
    'SAMBANOVA',
    'AI21',
    'CLOUDFLARE',
    'DATABRICKS',
    'COMETAPI',
    'HUGGINGFACE',
    'CUSTOM'
);


--
-- Name: loglevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.loglevel AS ENUM (
    'DEBUG',
    'INFO',
    'WARNING',
    'ERROR',
    'CRITICAL'
);


--
-- Name: logstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.logstatus AS ENUM (
    'IN_PROGRESS',
    'SUCCESS',
    'FAILED'
);


--
-- Name: maturity_framework_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.maturity_framework_status AS ENUM (
    'draft',
    'active',
    'archived'
);


--
-- Name: newchatmessagerole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.newchatmessagerole AS ENUM (
    'USER',
    'ASSISTANT',
    'SYSTEM'
);


--
-- Name: policy_module; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.policy_module AS ENUM (
    'general',
    'privacy'
);


--
-- Name: policy_review_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.policy_review_status AS ENUM (
    'analyzing',
    'completed',
    'applying_changes',
    'applied',
    'failed'
);


--
-- Name: policy_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.policy_status AS ENUM (
    'draft',
    'review',
    'approved',
    'archived'
);


--
-- Name: raci_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.raci_role AS ENUM (
    'responsible',
    'accountable',
    'consulted',
    'informed'
);


--
-- Name: report_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_type AS ENUM (
    'executive_summary',
    'controls',
    'policies',
    'evidence',
    'mappings',
    'soa',
    'compliance_readiness',
    'audit_bundle'
);


--
-- Name: report_version; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_version AS ENUM (
    'draft',
    'v1.0',
    'v1.1',
    'v2.0',
    'final'
);


--
-- Name: risk_assessment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.risk_assessment_status AS ENUM (
    'draft',
    'approved',
    'reviewed'
);


--
-- Name: roadmap_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.roadmap_status AS ENUM (
    'draft',
    'active',
    'on_track',
    'delayed',
    'completed'
);


--
-- Name: role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.role AS ENUM (
    'owner',
    'admin',
    'editor',
    'viewer',
    'auditor'
);


--
-- Name: scc_module; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.scc_module AS ENUM (
    'c2c',
    'c2p',
    'p2p',
    'p2c'
);


--
-- Name: searchsourceconnectortype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.searchsourceconnectortype AS ENUM (
    'SERPER_API',
    'TAVILY_API',
    'SEARXNG_API',
    'LINKUP_API',
    'BAIDU_SEARCH_API',
    'SLACK_CONNECTOR',
    'TEAMS_CONNECTOR',
    'NOTION_CONNECTOR',
    'GITHUB_CONNECTOR',
    'LINEAR_CONNECTOR',
    'DISCORD_CONNECTOR',
    'JIRA_CONNECTOR',
    'CONFLUENCE_CONNECTOR',
    'CLICKUP_CONNECTOR',
    'GOOGLE_CALENDAR_CONNECTOR',
    'GOOGLE_GMAIL_CONNECTOR',
    'GOOGLE_DRIVE_CONNECTOR',
    'AIRTABLE_CONNECTOR',
    'LUMA_CONNECTOR',
    'ELASTICSEARCH_CONNECTOR',
    'WEBCRAWLER_CONNECTOR',
    'BOOKSTACK_CONNECTOR',
    'CIRCLEBACK_CONNECTOR'
);


--
-- Name: task_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_type AS ENUM (
    'control',
    'policy',
    'evidence',
    'mapping'
);


--
-- Name: threat_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.threat_status AS ENUM (
    'active',
    'dormant',
    'monitored'
);


--
-- Name: transfer_tool; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transfer_tool AS ENUM (
    'scc_2021',
    'bcr',
    'adequacy',
    'derogation',
    'ad_hoc'
);


--
-- Name: vulnerability_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vulnerability_status AS ENUM (
    'open',
    'mitigated',
    'accepted',
    'remediated'
);


--
-- Name: work_item_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_item_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


--
-- Name: work_item_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_item_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'cancelled',
    'escalated'
);


--
-- Name: work_item_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_item_type AS ENUM (
    'review',
    'approval',
    'evidence_collection',
    'raci_assignment',
    'risk_treatment',
    'vendor_assessment',
    'bcp_approval',
    'policy_review',
    'control_implementation',
    'risk_review',
    'control_assessment'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in',
    'like',
    'ilike',
    'is',
    'match',
    'imatch',
    'isdistinct'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text,
	negate boolean
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: graphql(text, text, jsonb, jsonb); Type: FUNCTION; Schema: graphql_public; Owner: -
--

CREATE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
    -- Regclass of the table e.g. public.notes
    entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

    -- I, U, D, T: insert, update ...
    action realtime.action = (
        case wal ->> 'action'
            when 'I' then 'INSERT'
            when 'U' then 'UPDATE'
            when 'D' then 'DELETE'
            else 'ERROR'
        end
    );

    -- Is row level security enabled for the table
    is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

    subscriptions realtime.subscription[] = array_agg(subs)
        from
            realtime.subscription subs
        where
            subs.entity = entity_
            -- Filter by action early - only get subscriptions interested in this action
            -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
            and (subs.action_filter = '*' or subs.action_filter = action::text);

    -- Subscription vars
    working_role regrole;
    working_selected_columns text[];
    claimed_role regrole;
    claims jsonb;

    subscription_id uuid;
    subscription_has_access bool;
    visible_to_subscription_ids uuid[] = '{}';

    -- structured info for wal's columns
    columns realtime.wal_column[];
    -- previous identity values for update/delete
    old_columns realtime.wal_column[];

    error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

    -- Primary jsonb output for record
    output jsonb;

    -- Loop record for iterating unique roles (outer loop)
    role_record record;
    -- Loop record for iterating unique selected_columns within a role (inner loop)
    cols_record record;
    -- Subscription ids visible at the role level (before fanning out by selected_columns)
    visible_role_sub_ids uuid[] = '{}';

begin
    perform set_config('role', null, true);

    columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'columns') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    old_columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'identity') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    for role_record in
        select claims_role
        from (select distinct claims_role from unnest(subscriptions)) t
        order by claims_role::text
    loop
        working_role := role_record.claims_role;

        -- Update `is_selectable` for columns and old_columns (once per role)
        columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(columns) c;

        old_columns =
                array_agg(
                    (
                        c.name,
                        c.type_name,
                        c.type_oid,
                        c.value,
                        c.is_pkey,
                        pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                    )::realtime.wal_column
                )
                from
                    unnest(old_columns) c;

        if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
            -- Fan out 400 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 400: Bad Request, no primary key']
                )::realtime.wal_rls;
            end loop;

        -- The claims role does not have SELECT permission to the primary key of entity
        elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
            -- Fan out 401 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 401: Unauthorized']
                )::realtime.wal_rls;
            end loop;

        else
            -- Create the prepared statement (once per role)
            if is_rls_enabled and action <> 'DELETE' then
                if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                    deallocate walrus_rls_stmt;
                end if;
                execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
            end if;

            -- Collect all visible subscription IDs for this role (filter check + RLS check)
            visible_role_sub_ids = '{}';

            for subscription_id, claims in (
                    select
                        subs.subscription_id,
                        subs.claims
                    from
                        unnest(subscriptions) subs
                    where
                        subs.entity = entity_
                        and subs.claims_role = working_role
                        and (
                            realtime.is_visible_through_filters(columns, subs.filters)
                            or (
                              action = 'DELETE'
                              and realtime.is_visible_through_filters(old_columns, subs.filters)
                            )
                        )
            ) loop

                if not is_rls_enabled or action = 'DELETE' then
                    visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                else
                    -- Check if RLS allows the role to see the record
                    perform
                        -- Trim leading and trailing quotes from working_role because set_config
                        -- doesn't recognize the role as valid if they are included
                        set_config('role', trim(both '"' from working_role::text), true),
                        set_config('request.jwt.claims', claims::text, true);

                    execute 'execute walrus_rls_stmt' into subscription_has_access;

                    if subscription_has_access then
                        visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                    end if;
                end if;
            end loop;

            perform set_config('role', null, true);

            -- Inner loop: per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;

                output = jsonb_build_object(
                    'schema', wal ->> 'schema',
                    'table', wal ->> 'table',
                    'type', action,
                    'commit_timestamp', to_char(
                        ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                    ),
                    'columns', (
                        select
                            jsonb_agg(
                                jsonb_build_object(
                                    'name', pa.attname,
                                    'type', pt.typname
                                )
                                order by pa.attnum asc
                            )
                        from
                            pg_attribute pa
                            join pg_type pt
                                on pa.atttypid = pt.oid
                            left join (
                                select unnest(conkey) as pkey_attnum
                                from pg_constraint
                                where conrelid = entity_ and contype = 'p'
                            ) pk on pk.pkey_attnum = pa.attnum
                        where
                            attrelid = entity_
                            and attnum > 0
                            and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
                            and (working_selected_columns is null or pa.attname = any(working_selected_columns) or pk.pkey_attnum is not null)
                    )
                )
                -- Add "record" key for insert and update
                || case
                    when action in ('INSERT', 'UPDATE') then
                        jsonb_build_object(
                            'record',
                            (
                                select
                                    jsonb_object_agg(
                                        -- if unchanged toast, get column name and value from old record
                                        coalesce((c).name, (oc).name),
                                        case
                                            when (c).name is null then (oc).value
                                            else (c).value
                                        end
                                    )
                                from
                                    unnest(columns) c
                                    full outer join unnest(old_columns) oc
                                        on (c).name = (oc).name
                                where
                                    coalesce((c).is_selectable, (oc).is_selectable)
                                    and (working_selected_columns is null or coalesce((c).name, (oc).name) = any(working_selected_columns) or coalesce((c).is_pkey, (oc).is_pkey))
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            )
                        )
                    else '{}'::jsonb
                end
                -- Add "old_record" key for update and delete
                || case
                    when action = 'UPDATE' then
                        jsonb_build_object(
                                'old_record',
                                (
                                    select jsonb_object_agg((c).name, (c).value)
                                    from unnest(old_columns) c
                                    where
                                        (c).is_selectable
                                        and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                        and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                )
                            )
                    when action = 'DELETE' then
                        jsonb_build_object(
                            'old_record',
                            (
                                select jsonb_object_agg((c).name, (c).value)
                                from unnest(old_columns) c
                                where
                                    (c).is_selectable
                                    and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                    and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                            )
                        )
                    else '{}'::jsonb
                end;

                -- Filter visible_role_sub_ids to those matching the current selected_columns group
                visible_to_subscription_ids = coalesce(
                    (
                        select array_agg(s.subscription_id)
                        from unnest(subscriptions) s
                        where s.claims_role = working_role
                          and (s.selected_columns is not distinct from working_selected_columns)
                          and s.subscription_id = any(visible_role_sub_ids)
                    ),
                    '{}'::uuid[]
                );

                return next (
                    output,
                    is_rls_enabled,
                    visible_to_subscription_ids,
                    case
                        when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                        else '{}'
                    end
                )::realtime.wal_rls;
            end loop;

        end if;
    end loop;

    perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
/*
Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
*/
declare
    op_symbol text = (
        case
            when op = 'eq' then '='
            when op = 'neq' then '!='
            when op = 'lt' then '<'
            when op = 'lte' then '<='
            when op = 'gt' then '>'
            when op = 'gte' then '>='
            when op = 'in' then '= any'
            else 'UNKNOWN OP'
        end
    );
    res boolean;
begin
    execute format(
        'select %L::'|| type_::text || ' ' || op_symbol
        || ' ( %L::'
        || (
            case
                when op = 'in' then type_::text || '[]'
                else type_::text end
        )
        || ')', val_1, val_2) into res;
    return res;
end;
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
declare
    op_symbol text;
    res boolean;
begin
    -- IS DISTINCT FROM / IS NOT DISTINCT FROM: infix, both sides typed literals
    if op = 'isdistinct' then
        execute format(
            'select %L::%s %s %L::%s',
            val_1,
            type_::text,
            case when negate then 'IS NOT DISTINCT FROM' else 'IS DISTINCT FROM' end,
            val_2,
            type_::text
        ) into res;
        return res;
    end if;

    -- IS requires a keyword RHS (NULL, TRUE, FALSE, UNKNOWN), not a typed literal
    if op = 'is' then
        if val_2 not in ('null', 'true', 'false', 'unknown') then
            raise exception 'invalid value for is filter: must be null, true, false, or unknown';
        end if;
        execute format(
            'select %L::%s %s %s',
            val_1,
            type_::text,
            case when negate then 'IS NOT' else 'IS' end,
            upper(val_2)
        ) into res;
        return res;
    end if;

    op_symbol = case
        when op = 'eq'    then '='
        when op = 'neq'   then '!='
        when op = 'lt'    then '<'
        when op = 'lte'   then '<='
        when op = 'gt'    then '>'
        when op = 'gte'   then '>='
        when op = 'in'    then '= any'
        when op = 'like'   then 'LIKE'
        when op = 'ilike'  then 'ILIKE'
        when op = 'match'  then '~'
        when op = 'imatch' then '~*'
        else null
    end;

    if op_symbol is null then
        raise exception 'unsupported equality operator: %', op::text;
    end if;

    execute format(
        'select %L::%s %s (%L::%s)',
        val_1,
        type_::text,
        op_symbol,
        val_2,
        case when op = 'in' then type_::text || '[]' else type_::text end
    ) into res;

    return case when negate then not res else res end;
end;
$$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    select
        filters is null
        or array_length(filters, 1) is null
        or coalesce(
            count(col.name) = count(1)
            and sum(
                realtime.check_equality_op(
                    op:=f.op,
                    type_:=coalesce(col.type_oid::regtype, col.type_name::regtype),
                    val_1:=col.value #>> '{}',
                    val_2:=f.value,
                    negate:=coalesce(f.negate, false)
                )::int
            ) filter (where col.name is not null) = count(col.name),
            false
        )
    from
        unnest(filters) f
        left join unnest(columns) col
            on f.column_name = col.name;
$$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  SELECT
    realtime.wal2json_escape_identifier(nsp.nspname::text)
    || '.'
    || realtime.wal2json_escape_identifier(pc.relname::text)
  FROM pg_class pc
  JOIN pg_namespace nsp ON pc.relnamespace = nsp.oid
  WHERE pc.oid = entity
$$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: send_binary(bytea, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, binary_payload, event, topic, private, extension)
    VALUES (generated_id, payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    col_names text[] = coalesce(
            array_agg(a.attname order by a.attnum),
            '{}'::text[]
        )
        from
            pg_catalog.pg_attribute a
        where
            a.attrelid = new.entity
            and a.attnum > 0
            and not a.attisdropped
            and pg_catalog.has_column_privilege(
                (new.claims ->> 'role'),
                a.attrelid,
                a.attnum,
                'SELECT'
            );
    filter realtime.user_defined_filter;
    col_type regtype;
    in_val jsonb;
    selected_col text;
begin
    for filter in select * from unnest(new.filters) loop
        if not filter.column_name = any(col_names) then
            raise exception 'invalid column for filter %', filter.column_name;
        end if;

        col_type = (
            select atttypid::regtype
            from pg_catalog.pg_attribute
            where attrelid = new.entity
                  and attname = filter.column_name
        );
        if col_type is null then
            raise exception 'failed to lookup type for column %', filter.column_name;
        end if;

        if filter.op = 'in'::realtime.equality_op then
            in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
            if coalesce(jsonb_array_length(in_val), 0) > 100 then
                raise exception 'too many values for `in` filter. Maximum 100';
            end if;
        elsif filter.op = 'is'::realtime.equality_op then
            -- `is` requires a keyword RHS rather than a typed literal
            if filter.value not in ('null', 'true', 'false', 'unknown') then
                raise exception 'invalid value for is filter: must be null, true, false, or unknown';
            end if;
            -- IS NULL works for any type, but IS TRUE/FALSE/UNKNOWN require a boolean
            -- operand. Reject the non-null keywords on non-boolean columns here so they
            -- don't abort apply_rls at WAL time.
            if filter.value <> 'null' and col_type <> 'boolean'::regtype then
                raise exception 'is % filter requires a boolean column, got %', filter.value, col_type::text;
            end if;
        elsif filter.op in ('like'::realtime.equality_op, 'ilike'::realtime.equality_op) then
            -- like/ilike apply the text pattern operator (~~); reject column types that
            -- have no such operator instead of failing at WAL time
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = '~~' and oprleft = col_type
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
        elsif filter.op in ('match'::realtime.equality_op, 'imatch'::realtime.equality_op) then
            -- match/imatch apply the regex operators ~ / ~*; reject column types that have
            -- no such operator (e.g. integer) instead of failing at WAL time, mirroring the
            -- like/ilike guard above.
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = case when filter.op = 'imatch'::realtime.equality_op then '~*' else '~' end
                  and oprleft = col_type
                  and oprright = col_type
                  and oprresult = 'boolean'::regtype
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
            -- validate the regex eagerly so a bad pattern is rejected here, not inside
            -- apply_rls where it would abort the WAL stream for the entity
            begin
                perform '' ~ filter.value;
            exception when others then
                raise exception 'invalid regular expression for % filter: %', filter.op::text, sqlerrm;
            end;
        else
            -- eq/neq/lt/lte/gt/gte: value must be coercable to the type
            perform realtime.cast(filter.value, col_type);
        end if;
    end loop;

    if new.selected_columns is not null then
        for selected_col in select * from unnest(new.selected_columns) loop
            if not selected_col = any(col_names) then
                raise exception 'invalid column for select %', selected_col;
            end if;
        end loop;
    end if;

    -- Apply consistent order to filters so the unique constraint can't be tricked by a
    -- different filter order. negate is part of the sort key.
    new.filters = coalesce(
        array_agg(f order by f.column_name, f.op, f.value, f.negate),
        '{}'
    ) from unnest(new.filters) f;

    new.selected_columns = (
        select array_agg(c order by c)
        from unnest(new.selected_columns) c
    );

    return new;
end;
$$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: wal2json_escape_identifier(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.wal2json_escape_identifier(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  -- Prefix `\`, `,`, `.`, and any whitespace with `\`
  SELECT regexp_replace(name, '([\\,.[:space:]])', '\\\1', 'g')
$$;


--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_claims_allowlist text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


--
-- Name: addon_run_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addon_run_logs (
    id integer NOT NULL,
    subscription_id integer,
    addon_slug character varying(64) NOT NULL,
    client_id integer NOT NULL,
    trigger character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    findings_count integer DEFAULT 0,
    risks_created integer DEFAULT 0,
    evidence_pushed integer DEFAULT 0,
    duration_seconds integer,
    started_at timestamp without time zone NOT NULL,
    completed_at timestamp without time zone,
    error_message text,
    summary jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: addon_run_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.addon_run_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: addon_run_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.addon_run_logs_id_seq OWNED BY public.addon_run_logs.id;


--
-- Name: addon_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addon_subscriptions (
    id integer NOT NULL,
    client_id integer NOT NULL,
    addon_slug character varying(64) NOT NULL,
    status character varying(20) DEFAULT 'trial'::character varying NOT NULL,
    trial_ends_at timestamp without time zone,
    current_period_start timestamp without time zone,
    current_period_end timestamp without time zone,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    stripe_subscription_id character varying(128),
    stripe_price_id character varying(128),
    last_sync_at timestamp without time zone,
    next_scheduled_run timestamp without time zone,
    auto_renew boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: addon_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.addon_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: addon_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.addon_subscriptions_id_seq OWNED BY public.addon_subscriptions.id;


--
-- Name: adequacy_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adequacy_decisions (
    id integer NOT NULL,
    country_code character varying(2) NOT NULL,
    country_name character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'adequate'::character varying,
    scope text,
    decision_url text,
    last_updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: adequacy_decisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.adequacy_decisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adequacy_decisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.adequacy_decisions_id_seq OWNED BY public.adequacy_decisions.id;


--
-- Name: admin_err_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_err_id (
    id integer
);


--
-- Name: advisor_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.advisor_conversations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    client_id integer,
    conversation_id character varying(100) NOT NULL,
    title character varying(500),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: advisor_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.advisor_conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: advisor_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.advisor_conversations_id_seq OWNED BY public.advisor_conversations.id;


--
-- Name: advisor_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.advisor_messages (
    id integer NOT NULL,
    conversation_id character varying(100) NOT NULL,
    role character varying(20) NOT NULL,
    content text NOT NULL,
    sources json,
    metadata json,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: advisor_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.advisor_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: advisor_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.advisor_messages_id_seq OWNED BY public.advisor_messages.id;


--
-- Name: ai_impact_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_impact_assessments (
    id integer NOT NULL,
    ai_system_id integer NOT NULL,
    assessor_id integer,
    status character varying(50) DEFAULT 'draft'::character varying,
    safety_impact text,
    bias_impact text,
    privacy_impact text,
    security_impact text,
    overall_risk_score integer,
    assessment_date timestamp without time zone DEFAULT now(),
    next_review_date timestamp without time zone,
    recommendations text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: ai_impact_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_impact_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_impact_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_impact_assessments_id_seq OWNED BY public.ai_impact_assessments.id;


--
-- Name: ai_system_controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_system_controls (
    id integer NOT NULL,
    ai_system_id integer NOT NULL,
    control_id integer NOT NULL,
    status character varying(50) DEFAULT 'mapped'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: ai_system_controls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_system_controls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_system_controls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_system_controls_id_seq OWNED BY public.ai_system_controls.id;


--
-- Name: ai_systems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_systems (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    purpose text,
    intended_users text,
    deployment_context text,
    type character varying(100),
    risk_level public.ai_risk_level DEFAULT 'medium'::public.ai_risk_level,
    status public.ai_system_status DEFAULT 'evaluation'::public.ai_system_status,
    owner character varying(255),
    data_sensitivity character varying(100),
    technical_constraints text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    vendor_id integer
);


--
-- Name: ai_systems_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_systems_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_systems_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_systems_id_seq OWNED BY public.ai_systems.id;


--
-- Name: ai_usage_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage_metrics (
    id integer NOT NULL,
    client_id integer,
    user_id integer,
    endpoint character varying(255) NOT NULL,
    provider character varying(50) NOT NULL,
    model character varying(100) NOT NULL,
    prompt_tokens integer DEFAULT 0 NOT NULL,
    completion_tokens integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    estimated_cost_cents integer DEFAULT 0 NOT NULL,
    latency_ms integer,
    success boolean DEFAULT true,
    error_message text,
    request_metadata json,
    created_at timestamp without time zone DEFAULT now(),
    entity_type character varying(50),
    entity_id integer
);


--
-- Name: ai_usage_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_usage_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_usage_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_usage_metrics_id_seq OWNED BY public.ai_usage_metrics.id;


--
-- Name: approval_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_requests (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    status public.approval_status DEFAULT 'pending'::public.approval_status,
    submitter_id integer,
    submitted_at timestamp without time zone DEFAULT now(),
    required_roles json,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: approval_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approval_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approval_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approval_requests_id_seq OWNED BY public.approval_requests.id;


--
-- Name: approval_signatures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_signatures (
    id integer NOT NULL,
    request_id integer NOT NULL,
    signer_id integer NOT NULL,
    signer_role character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'signed'::character varying,
    comment text,
    signature_data text,
    signed_at timestamp without time zone DEFAULT now()
);


--
-- Name: approval_signatures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approval_signatures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approval_signatures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approval_signatures_id_seq OWNED BY public.approval_signatures.id;


--
-- Name: asset_cve_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_cve_matches (
    id integer NOT NULL,
    client_id integer NOT NULL,
    asset_id integer NOT NULL,
    cve_id character varying(50) NOT NULL,
    match_score integer DEFAULT 100,
    match_reason text,
    is_kev boolean DEFAULT false,
    status character varying(50) DEFAULT 'suggested'::character varying,
    imported_vulnerability_id integer,
    discovered_at timestamp without time zone DEFAULT now(),
    reviewed_at timestamp without time zone,
    reviewed_by integer
);


--
-- Name: asset_cve_matches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asset_cve_matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asset_cve_matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asset_cve_matches_id_seq OWNED BY public.asset_cve_matches.id;


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(100) NOT NULL,
    owner character varying(255),
    valuation_c integer DEFAULT 3,
    valuation_i integer DEFAULT 3,
    valuation_a integer DEFAULT 3,
    description text,
    location character varying(255),
    department character varying(255),
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    status public.asset_status DEFAULT 'active'::public.asset_status,
    acquisition_date timestamp without time zone,
    last_review_date timestamp without time zone,
    vendor character varying(255),
    product_name character varying(255),
    version character varying(100),
    technologies json,
    is_personal_data boolean DEFAULT false,
    data_sensitivity character varying(50),
    data_format character varying(50),
    data_owner character varying(255),
    category character varying(100),
    criticality character varying(50),
    ip_address character varying(50),
    mac_address character varying(50),
    os character varying(100),
    custom_fields json,
    tags json DEFAULT '[]'::json,
    last_scanned_at timestamp without time zone,
    cui_scope boolean DEFAULT false,
    cui_category character varying(100),
    cui_justification text
);


--
-- Name: assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assets_id_seq OWNED BY public.assets.id;


--
-- Name: asvs_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asvs_assessments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    requirement_id character varying(20) NOT NULL,
    status character varying(50) DEFAULT 'unanswered'::character varying,
    notes text,
    evidence jsonb DEFAULT '[]'::jsonb,
    assessed_by integer,
    assessment_date timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: asvs_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asvs_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asvs_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asvs_assessments_id_seq OWNED BY public.asvs_assessments.id;


--
-- Name: asvs_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asvs_categories (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    "order" integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: asvs_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asvs_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asvs_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asvs_categories_id_seq OWNED BY public.asvs_categories.id;


--
-- Name: asvs_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asvs_requirements (
    id integer NOT NULL,
    category_code character varying(10) NOT NULL,
    chapter_id character varying(20) NOT NULL,
    chapter_name character varying(255),
    requirement_id character varying(20) NOT NULL,
    description text NOT NULL,
    level_1 boolean DEFAULT false,
    level_2 boolean DEFAULT false,
    level_3 boolean DEFAULT false,
    cwe character varying(50),
    nist character varying(50),
    version character varying(20) DEFAULT '4.0.3'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: asvs_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asvs_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asvs_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asvs_requirements_id_seq OWNED BY public.asvs_requirements.id;


--
-- Name: audit_findings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_findings (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    severity public.finding_severity DEFAULT 'medium'::public.finding_severity,
    status public.finding_status DEFAULT 'open'::public.finding_status,
    evidence_id integer,
    author_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    fisma_system_id integer
);


--
-- Name: audit_findings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_findings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_findings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_findings_id_seq OWNED BY public.audit_findings.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    client_id integer,
    user_id integer NOT NULL,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer,
    details json,
    severity character varying(20) DEFAULT 'info'::character varying,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: audit_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_notes (
    id integer NOT NULL,
    client_id integer NOT NULL,
    control_id integer NOT NULL,
    user_id integer,
    note text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: audit_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_notes_id_seq OWNED BY public.audit_notes.id;


--
-- Name: bc_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bc_approvals (
    id integer NOT NULL,
    client_id integer NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    approver_id integer NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    requested_at timestamp without time zone DEFAULT now(),
    responded_at timestamp without time zone,
    comments text
);


--
-- Name: bc_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bc_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bc_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bc_approvals_id_seq OWNED BY public.bc_approvals.id;


--
-- Name: bc_committee_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bc_committee_members (
    id integer NOT NULL,
    program_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(100) NOT NULL,
    name character varying(255),
    responsibilities text,
    assigned_at timestamp without time zone DEFAULT now()
);


--
-- Name: bc_committee_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bc_committee_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bc_committee_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bc_committee_members_id_seq OWNED BY public.bc_committee_members.id;


--
-- Name: bc_plan_appendices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bc_plan_appendices (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    file_url character varying(1024),
    type character varying(50),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: bc_plan_appendices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bc_plan_appendices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bc_plan_appendices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bc_plan_appendices_id_seq OWNED BY public.bc_plan_appendices.id;


--
-- Name: bc_plan_bias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bc_plan_bias (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    bia_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: bc_plan_bias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bc_plan_bias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bc_plan_bias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bc_plan_bias_id_seq OWNED BY public.bc_plan_bias.id;


--
-- Name: bc_plan_communication_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bc_plan_communication_channels (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    audience character varying(100) NOT NULL,
    channel character varying(100),
    responsible_role character varying(255),
    message_template text,
    frequency character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: bc_plan_communication_channels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bc_plan_communication_channels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bc_plan_communication_channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bc_plan_communication_channels_id_seq OWNED BY public.bc_plan_communication_channels.id;


--
-- Name: bc_plan_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bc_plan_contacts (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    user_id integer,
    vendor_contact_id integer,
    role character varying(100),
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: bc_plan_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bc_plan_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bc_plan_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bc_plan_contacts_id_seq OWNED BY public.bc_plan_contacts.id;


--
-- Name: bc_plan_logistics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bc_plan_logistics (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    type character varying(50) NOT NULL,
    location_name character varying(255) NOT NULL,
    address text,
    capacity integer,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: bc_plan_logistics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bc_plan_logistics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bc_plan_logistics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bc_plan_logistics_id_seq OWNED BY public.bc_plan_logistics.id;


--
-- Name: bc_plan_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bc_plan_scenarios (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    scenario_id integer NOT NULL,
    coverage_notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: bc_plan_scenarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bc_plan_scenarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bc_plan_scenarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bc_plan_scenarios_id_seq OWNED BY public.bc_plan_scenarios.id;


--
-- Name: bc_plan_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bc_plan_sections (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    section_key character varying(100) NOT NULL,
    content text,
    "order" integer DEFAULT 0,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: bc_plan_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bc_plan_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bc_plan_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bc_plan_sections_id_seq OWNED BY public.bc_plan_sections.id;


--
-- Name: bc_plan_strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bc_plan_strategies (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    strategy_id integer NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: bc_plan_strategies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bc_plan_strategies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bc_plan_strategies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bc_plan_strategies_id_seq OWNED BY public.bc_plan_strategies.id;


--
-- Name: bc_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bc_plans (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    version character varying(50) DEFAULT '1.0'::character varying,
    status character varying(50) DEFAULT 'draft'::character varying,
    owner_id integer,
    last_tested_date timestamp without time zone,
    next_test_date timestamp without time zone,
    content text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: bc_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bc_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bc_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bc_plans_id_seq OWNED BY public.bc_plans.id;


--
-- Name: bc_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bc_programs (
    id integer NOT NULL,
    client_id integer NOT NULL,
    program_name character varying(255) DEFAULT 'Business Continuity Management Program'::character varying NOT NULL,
    scope_description text,
    policy_statement text,
    budget_allocated character varying(100),
    program_manager_id integer,
    executive_sponsor_id integer,
    status character varying(50) DEFAULT 'draft'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: bc_programs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bc_programs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bc_programs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bc_programs_id_seq OWNED BY public.bc_programs.id;


--
-- Name: bc_strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bc_strategies (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    resource_requirements text,
    estimated_cost character varying(100),
    benefits text,
    approval_status character varying(50) DEFAULT 'draft'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: bc_strategies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bc_strategies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bc_strategies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bc_strategies_id_seq OWNED BY public.bc_strategies.id;


--
-- Name: bc_training_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bc_training_records (
    id integer NOT NULL,
    client_id integer NOT NULL,
    user_id integer NOT NULL,
    training_type character varying(100) NOT NULL,
    completion_date timestamp without time zone,
    expiry_date timestamp without time zone,
    status character varying(50) DEFAULT 'completed'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: bc_training_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bc_training_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bc_training_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bc_training_records_id_seq OWNED BY public.bc_training_records.id;


--
-- Name: bcp_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bcp_projects (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    scope text,
    manager_id integer,
    start_date timestamp without time zone,
    target_date timestamp without time zone,
    status character varying(50) DEFAULT 'planning'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: bcp_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bcp_projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bcp_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bcp_projects_id_seq OWNED BY public.bcp_projects.id;


--
-- Name: bcp_stakeholders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bcp_stakeholders (
    id integer NOT NULL,
    project_id integer,
    process_id integer,
    user_id integer NOT NULL,
    role character varying(50) NOT NULL,
    assigned_date timestamp without time zone DEFAULT now()
);


--
-- Name: bcp_stakeholders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bcp_stakeholders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bcp_stakeholders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bcp_stakeholders_id_seq OWNED BY public.bcp_stakeholders.id;


--
-- Name: bia_questionnaires; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bia_questionnaires (
    id integer NOT NULL,
    bia_id integer NOT NULL,
    question text NOT NULL,
    category character varying(100),
    response text,
    impact_level character varying(50),
    notes text,
    "order" integer DEFAULT 0
);


--
-- Name: bia_questionnaires_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bia_questionnaires_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bia_questionnaires_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bia_questionnaires_id_seq OWNED BY public.bia_questionnaires.id;


--
-- Name: bia_seasonal_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bia_seasonal_events (
    id integer NOT NULL,
    bia_id integer NOT NULL,
    name character varying(255) NOT NULL,
    start_date character varying(50),
    end_date character varying(50),
    impact_description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: bia_seasonal_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bia_seasonal_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bia_seasonal_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bia_seasonal_events_id_seq OWNED BY public.bia_seasonal_events.id;


--
-- Name: bia_vital_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bia_vital_records (
    id integer NOT NULL,
    bia_id integer NOT NULL,
    record_name character varying(255) NOT NULL,
    media_type character varying(50),
    location character varying(255),
    backup_method character varying(255),
    rto character varying(50),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: bia_vital_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bia_vital_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bia_vital_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bia_vital_records_id_seq OWNED BY public.bia_vital_records.id;


--
-- Name: business_impact_analyses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_impact_analyses (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying,
    conductor_id integer,
    approved_by integer,
    approved_at timestamp without time zone,
    methodology text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    project_id integer,
    process_id integer
);


--
-- Name: business_impact_analyses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_impact_analyses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_impact_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.business_impact_analyses_id_seq OWNED BY public.business_impact_analyses.id;


--
-- Name: business_processes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_processes (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    owner_id integer,
    department character varying(255),
    criticality_tier character varying(50),
    rto character varying(50),
    rpo character varying(50),
    mtpd character varying(50),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    parent_id integer
);


--
-- Name: business_processes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_processes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_processes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.business_processes_id_seq OWNED BY public.business_processes.id;


--
-- Name: certification_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certification_audits (
    id integer NOT NULL,
    client_id integer NOT NULL,
    framework_id integer,
    audit_firm character varying(255),
    auditor_name character varying(255),
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    status character varying(50) DEFAULT 'scheduled'::character varying,
    stage character varying(50),
    outcome character varying(50),
    notes text,
    report_url text,
    created_by_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: certification_audits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.certification_audits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: certification_audits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.certification_audits_id_seq OWNED BY public.certification_audits.id;


--
-- Name: checklist_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_states (
    id integer NOT NULL,
    client_id integer NOT NULL,
    checklist_id character varying(255) NOT NULL,
    items json DEFAULT '{}'::json,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: checklist_states_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.checklist_states_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: checklist_states_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.checklist_states_id_seq OWNED BY public.checklist_states.id;


--
-- Name: cisa_kev_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cisa_kev_cache (
    id integer NOT NULL,
    cve_id character varying(50) NOT NULL,
    vendor_project character varying(255),
    product character varying(255),
    vulnerability_name character varying(500),
    short_description text,
    required_action text,
    due_date timestamp without time zone,
    known_ransomware_campaign_use boolean DEFAULT false,
    date_added timestamp without time zone,
    fetched_at timestamp without time zone DEFAULT now()
);


--
-- Name: cisa_kev_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cisa_kev_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cisa_kev_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cisa_kev_cache_id_seq OWNED BY public.cisa_kev_cache.id;


--
-- Name: client_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_contacts (
    id integer NOT NULL,
    client_id integer NOT NULL,
    first_name character varying(255),
    last_name character varying(255),
    email character varying(255),
    department character varying(255),
    role character varying(100),
    phone character varying(50),
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: client_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_contacts_id_seq OWNED BY public.client_contacts.id;


--
-- Name: client_controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_controls (
    id integer NOT NULL,
    client_id integer NOT NULL,
    control_id integer NOT NULL,
    client_control_id character varying(50),
    custom_description text,
    owner character varying(255),
    status public.client_control_status DEFAULT 'not_implemented'::public.client_control_status,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    applicability character varying(50) DEFAULT 'applicable'::character varying,
    justification text,
    implementation_date timestamp without time zone,
    implementation_notes text,
    evidence_location text,
    due_date timestamp without time zone
);


--
-- Name: client_controls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_controls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_controls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_controls_id_seq OWNED BY public.client_controls.id;


--
-- Name: client_framework_controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_framework_controls (
    id integer NOT NULL,
    framework_id integer NOT NULL,
    control_code character varying(100) NOT NULL,
    title text NOT NULL,
    description text,
    "grouping" character varying(255),
    original_data json,
    created_at timestamp without time zone DEFAULT now(),
    status character varying(50) DEFAULT 'not_implemented'::character varying,
    applicability character varying(50) DEFAULT 'applicable'::character varying,
    owner character varying(255),
    custom_description text,
    implementation_notes text,
    evidence_location text,
    justification text,
    implementation_date timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: client_framework_controls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_framework_controls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_framework_controls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_framework_controls_id_seq OWNED BY public.client_framework_controls.id;


--
-- Name: client_framework_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_framework_mappings (
    id integer NOT NULL,
    framework_control_id integer NOT NULL,
    client_control_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: client_framework_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_framework_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_framework_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_framework_mappings_id_seq OWNED BY public.client_framework_mappings.id;


--
-- Name: client_frameworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_frameworks (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    version character varying(50),
    source_file_name character varying(255),
    imported_at timestamp without time zone DEFAULT now(),
    status character varying(50) DEFAULT 'active'::character varying
);


--
-- Name: client_frameworks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_frameworks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_frameworks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_frameworks_id_seq OWNED BY public.client_frameworks.id;


--
-- Name: client_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_integrations (
    id integer NOT NULL,
    client_id integer NOT NULL,
    provider character varying(50) DEFAULT 'smtp'::character varying NOT NULL,
    settings json,
    is_enabled boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: client_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_integrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_integrations_id_seq OWNED BY public.client_integrations.id;


--
-- Name: client_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_policies (
    id integer NOT NULL,
    client_id integer NOT NULL,
    template_id integer,
    client_policy_id character varying(50),
    name character varying(255) NOT NULL,
    content text,
    status public.policy_status DEFAULT 'draft'::public.policy_status,
    version integer DEFAULT 1,
    owner character varying(255),
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    module character varying(50) DEFAULT 'general'::character varying,
    is_ai_generated boolean DEFAULT false,
    tailoring_answers jsonb,
    reviewers jsonb,
    review_due_date timestamp without time zone,
    approval_status character varying(50) DEFAULT 'pending'::character varying,
    next_review_date timestamp without time zone,
    last_review_alert_sent_at timestamp without time zone
);


--
-- Name: client_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_policies_id_seq OWNED BY public.client_policies.id;


--
-- Name: client_readiness_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_readiness_responses (
    id integer NOT NULL,
    client_id integer NOT NULL,
    regulation_id character varying(50) NOT NULL,
    question_id character varying(50) NOT NULL,
    response character varying(50),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: client_readiness_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_readiness_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_readiness_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_readiness_responses_id_seq OWNED BY public.client_readiness_responses.id;


--
-- Name: client_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_settings (
    id integer NOT NULL,
    client_id integer NOT NULL,
    branding_overrides jsonb,
    feature_flags jsonb,
    custom_settings jsonb,
    version integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: client_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_settings_id_seq OWNED BY public.client_settings.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    industry character varying(255),
    size character varying(50),
    status character varying(50) DEFAULT 'active'::character varying,
    notes text,
    logo_url character varying(1024),
    primary_contact_name character varying(255),
    primary_contact_email character varying(255),
    primary_contact_phone character varying(50),
    deployment_type character varying(50),
    region character varying(100),
    client_tier character varying(50),
    target_compliance_score integer DEFAULT 80,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    ciso_name character varying(255),
    dpo_name character varying(255),
    headquarters character varying(255),
    main_service_region character varying(255),
    policy_language character varying(50) DEFAULT 'en'::character varying,
    legal_entity_name character varying(500),
    regulatory_jurisdictions json,
    default_document_classification character varying(50) DEFAULT 'internal'::character varying,
    stripe_customer_id character varying(255),
    subscription_status character varying(50),
    plan_tier character varying(50) DEFAULT 'free'::character varying,
    subscription_end_date timestamp without time zone,
    active_modules json,
    service_model character varying(50) DEFAULT 'subscription'::character varying,
    weekly_focus text,
    brand_primary_color character varying(20),
    brand_secondary_color character varying(20),
    portal_title character varying(255),
    scan_key character varying(255),
    require_mfa boolean DEFAULT false,
    sidebar_bg character varying(20),
    sidebar_fg character varying(20),
    heading_font character varying(100),
    body_font character varying(100),
    base_font_size integer DEFAULT 16
);


--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: cloud_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cloud_assets (
    id integer NOT NULL,
    connection_id integer NOT NULL,
    client_id integer NOT NULL,
    asset_type character varying(100) NOT NULL,
    asset_id character varying(255) NOT NULL,
    name character varying(255),
    region character varying(100),
    metadata json,
    compliance_status character varying(50) DEFAULT 'unknown'::character varying,
    last_scanned_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: cloud_assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cloud_assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cloud_assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cloud_assets_id_seq OWNED BY public.cloud_assets.id;


--
-- Name: cloud_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cloud_connections (
    id integer NOT NULL,
    client_id integer NOT NULL,
    provider character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    credentials text NOT NULL,
    region character varying(100),
    status character varying(50) DEFAULT 'pending'::character varying,
    last_sync_at timestamp without time zone,
    error_message text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: cloud_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cloud_connections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cloud_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cloud_connections_id_seq OWNED BY public.cloud_connections.id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    client_id integer NOT NULL,
    parent_id integer,
    is_resolved boolean DEFAULT false,
    resolved_by integer,
    resolved_at timestamp without time zone,
    context jsonb
);


--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: common_controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.common_controls (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    domain character varying(100),
    created_by_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: common_controls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.common_controls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: common_controls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.common_controls_id_seq OWNED BY public.common_controls.id;


--
-- Name: communication_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communication_templates (
    id integer NOT NULL,
    key character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    subject_template character varying(500) NOT NULL,
    body_template text NOT NULL,
    category character varying(50) DEFAULT 'general'::character varying,
    tags json,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: communication_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.communication_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: communication_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.communication_templates_id_seq OWNED BY public.communication_templates.id;


--
-- Name: compliance_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_certificates (
    id integer NOT NULL,
    client_id integer NOT NULL,
    framework_id integer,
    audit_id integer,
    certificate_number character varying(255),
    issue_date timestamp without time zone NOT NULL,
    expiry_date timestamp without time zone NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying,
    document_url text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: compliance_certificates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compliance_certificates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compliance_certificates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compliance_certificates_id_seq OWNED BY public.compliance_certificates.id;


--
-- Name: compliance_frameworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_frameworks (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    short_code character varying(50) NOT NULL,
    version character varying(50),
    description text,
    type character varying(50) DEFAULT 'framework'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: compliance_frameworks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compliance_frameworks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compliance_frameworks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compliance_frameworks_id_seq OWNED BY public.compliance_frameworks.id;


--
-- Name: compliance_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_requirements (
    id integer NOT NULL,
    client_id integer NOT NULL,
    key character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    is_mandatory boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: compliance_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compliance_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compliance_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compliance_requirements_id_seq OWNED BY public.compliance_requirements.id;


--
-- Name: compliance_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_snapshots (
    id integer NOT NULL,
    client_id integer NOT NULL,
    snapshot_date timestamp without time zone DEFAULT now() NOT NULL,
    total_controls integer DEFAULT 0,
    implemented_controls integer DEFAULT 0,
    in_progress_controls integer DEFAULT 0,
    not_implemented_controls integer DEFAULT 0,
    not_applicable_controls integer DEFAULT 0,
    total_gaps integer DEFAULT 0,
    closed_gaps integer DEFAULT 0,
    critical_gaps integer DEFAULT 0,
    high_gaps integer DEFAULT 0,
    total_risks integer DEFAULT 0,
    mitigated_risks integer DEFAULT 0,
    compliance_score integer DEFAULT 0,
    risk_score integer DEFAULT 0,
    controls_closed_this_period integer DEFAULT 0,
    gaps_closed_this_period integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: compliance_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compliance_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compliance_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compliance_snapshots_id_seq OWNED BY public.compliance_snapshots.id;


--
-- Name: consent_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consent_templates (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    consent_type public.consent_type NOT NULL,
    template_content text NOT NULL,
    granular_options json,
    retention_period integer DEFAULT 2555,
    is_active boolean DEFAULT true,
    version character varying(20) DEFAULT '1.0'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: consent_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.consent_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: consent_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consent_templates_id_seq OWNED BY public.consent_templates.id;


--
-- Name: consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consents (
    id integer NOT NULL,
    client_id integer NOT NULL,
    data_subject_id character varying(255) NOT NULL,
    consent_type public.consent_type NOT NULL,
    purpose text NOT NULL,
    legal_basis text NOT NULL,
    granular_consents json,
    consent_timestamp timestamp without time zone DEFAULT now(),
    ip_address character varying(45),
    user_agent text,
    consent_form text,
    withdrawal_timestamp timestamp without time zone,
    withdrawal_reason text,
    expiration_date timestamp without time zone,
    status public.consent_status DEFAULT 'active'::public.consent_status,
    retention_period integer,
    metadata json,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: consents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.consents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: consents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consents_id_seq OWNED BY public.consents.id;


--
-- Name: control_baselines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.control_baselines (
    id integer NOT NULL,
    control_id character varying(50) NOT NULL,
    framework character varying(100) NOT NULL,
    baseline character varying(20) NOT NULL
);


--
-- Name: control_baselines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.control_baselines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: control_baselines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.control_baselines_id_seq OWNED BY public.control_baselines.id;


--
-- Name: control_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.control_history (
    id integer NOT NULL,
    control_id integer NOT NULL,
    version integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    framework character varying(255),
    owner character varying(255),
    frequency character varying(50),
    evidence_type character varying(100),
    changed_by integer,
    change_note text,
    changed_at timestamp without time zone DEFAULT now()
);


--
-- Name: control_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.control_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: control_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.control_history_id_seq OWNED BY public.control_history.id;


--
-- Name: control_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.control_mappings (
    id integer NOT NULL,
    source_control_id integer NOT NULL,
    target_control_id integer NOT NULL,
    confidence character varying(50) DEFAULT 'manual'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    mapping_type character varying(50) DEFAULT 'equivalent'::character varying NOT NULL,
    notes text,
    created_by integer,
    entity_type character varying(50),
    entity_id integer,
    is_ai_generated boolean DEFAULT false
);


--
-- Name: control_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.control_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: control_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.control_mappings_id_seq OWNED BY public.control_mappings.id;


--
-- Name: control_policy_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.control_policy_mappings (
    id integer NOT NULL,
    client_id integer NOT NULL,
    client_control_id integer NOT NULL,
    client_policy_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    evidence_reference text,
    notes text,
    is_ai_generated boolean DEFAULT false
);


--
-- Name: control_policy_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.control_policy_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: control_policy_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.control_policy_mappings_id_seq OWNED BY public.control_policy_mappings.id;


--
-- Name: control_tech_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.control_tech_mappings (
    id integer NOT NULL,
    control_code character varying(50) NOT NULL,
    framework character varying(100) NOT NULL,
    tech_id character varying(100) NOT NULL,
    vendor character varying(100),
    service_name character varying(200),
    description text,
    pros json,
    cons json,
    implementation_effort character varying(50),
    maturity_level character varying(50),
    "references" json,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: control_tech_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.control_tech_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: control_tech_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.control_tech_mappings_id_seq OWNED BY public.control_tech_mappings.id;


--
-- Name: controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.controls (
    id integer NOT NULL,
    control_id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    framework character varying(255) NOT NULL,
    owner character varying(255),
    frequency character varying(50),
    evidence_type character varying(100),
    status public.control_status DEFAULT 'draft'::public.control_status,
    version integer DEFAULT 1 NOT NULL,
    category character varying(255),
    suggested_policies text,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    "grouping" character varying(255),
    implementation_guidance text,
    client_id integer,
    ai_guidance text,
    requirement_text text,
    official_guidance text,
    evidence_blueprint jsonb
);


--
-- Name: controls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.controls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: controls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.controls_id_seq OWNED BY public.controls.id;


--
-- Name: crime_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crime_id (
    id integer
);


--
-- Name: crm_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_activities (
    id integer NOT NULL,
    client_id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(50) NOT NULL,
    subject character varying(500),
    content text,
    outcome character varying(255),
    occurred_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: crm_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_activities_id_seq OWNED BY public.crm_activities.id;


--
-- Name: crm_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_contacts (
    id integer NOT NULL,
    client_id integer NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    job_title character varying(255),
    is_primary boolean DEFAULT false,
    category character varying(50),
    linkedin_url character varying(1024),
    notes text,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: crm_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_contacts_id_seq OWNED BY public.crm_contacts.id;


--
-- Name: crm_deal_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_deal_stages (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    "order" integer DEFAULT 0,
    win_probability integer,
    color character varying(50),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: crm_deal_stages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_deal_stages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_deal_stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_deal_stages_id_seq OWNED BY public.crm_deal_stages.id;


--
-- Name: crm_deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_deals (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    value integer,
    currency character varying(10) DEFAULT 'USD'::character varying,
    stage_id integer NOT NULL,
    lead_id integer,
    client_id integer,
    owner_id integer,
    expected_close_date timestamp without time zone,
    probability integer,
    notes text,
    status character varying(50) DEFAULT 'open'::character varying,
    lost_reason text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: crm_deals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_deals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_deals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_deals_id_seq OWNED BY public.crm_deals.id;


--
-- Name: crm_engagements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_engagements (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    stage public.crm_engagement_stage DEFAULT 'planned'::public.crm_engagement_stage,
    framework character varying(100),
    priority character varying(50) DEFAULT 'medium'::character varying,
    target_date timestamp without time zone,
    progress integer DEFAULT 0,
    owner character varying(255),
    controls_count integer DEFAULT 0,
    mitigated_risks_count integer DEFAULT 0,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: crm_engagements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_engagements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_engagements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_engagements_id_seq OWNED BY public.crm_engagements.id;


--
-- Name: crm_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_leads (
    id integer NOT NULL,
    client_id integer,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    email character varying(255),
    company_name character varying(255),
    job_title character varying(255),
    status character varying(50) DEFAULT 'new'::character varying,
    source character varying(100),
    notes text,
    owner_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: crm_leads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_leads_id_seq OWNED BY public.crm_leads.id;


--
-- Name: data_breaches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_breaches (
    id integer NOT NULL,
    client_id integer NOT NULL,
    description text NOT NULL,
    effects text NOT NULL,
    remedial_actions text NOT NULL,
    date_occurred timestamp without time zone,
    date_detected timestamp without time zone,
    date_reported_to_dpa timestamp without time zone,
    date_reported_to_data_subjects timestamp without time zone,
    status public.data_breach_status DEFAULT 'open'::public.data_breach_status,
    is_notifiable_to_dpa boolean DEFAULT false,
    is_notifiable_to_subjects boolean DEFAULT false,
    created_by integer,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: data_breaches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_breaches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_breaches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_breaches_id_seq OWNED BY public.data_breaches.id;


--
-- Name: data_flow_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_flow_connections (
    id integer NOT NULL,
    flow_id integer NOT NULL,
    source_node_id integer NOT NULL,
    target_node_id integer NOT NULL,
    connection_type character varying(50) NOT NULL,
    data_type character varying(100) NOT NULL,
    frequency character varying(50),
    security_controls text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: data_flow_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_flow_connections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_flow_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_flow_connections_id_seq OWNED BY public.data_flow_connections.id;


--
-- Name: data_flow_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_flow_nodes (
    id integer NOT NULL,
    flow_id integer NOT NULL,
    node_type character varying(50) NOT NULL,
    node_name character varying(255) NOT NULL,
    node_description text,
    node_category character varying(100),
    position_x integer DEFAULT 0,
    position_y integer DEFAULT 0,
    node_metadata json,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: data_flow_nodes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_flow_nodes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_flow_nodes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_flow_nodes_id_seq OWNED BY public.data_flow_nodes.id;


--
-- Name: data_flow_visualizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_flow_visualizations (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    source_system character varying(255) NOT NULL,
    target_system character varying(255) NOT NULL,
    data_type character varying(100) NOT NULL,
    flow_type character varying(100) NOT NULL,
    process_id integer,
    legal_basis text,
    frequency character varying(50),
    volume character varying(100),
    security_measures text,
    countries json,
    flow_metadata json,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: data_flow_visualizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_flow_visualizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_flow_visualizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_flow_visualizations_id_seq OWNED BY public.data_flow_visualizations.id;


--
-- Name: data_protection_impact_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_protection_impact_assessments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    activity_id integer,
    title text NOT NULL,
    description text NOT NULL,
    scope text NOT NULL,
    identified_risks text NOT NULL,
    mitigation_measures text NOT NULL,
    status public.dpia_status DEFAULT 'draft'::public.dpia_status,
    assigned_to integer,
    last_review_date timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    questionnaire_data json
);


--
-- Name: data_protection_impact_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_protection_impact_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_protection_impact_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_protection_impact_assessments_id_seq OWNED BY public.data_protection_impact_assessments.id;


--
-- Name: db_fail_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_fail_id (
    id integer
);


--
-- Name: dev_err_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dev_err_id (
    id integer
);


--
-- Name: dev_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dev_projects (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    repository_url character varying(500),
    tech_stack json,
    owner character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: dev_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dev_projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dev_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dev_projects_id_seq OWNED BY public.dev_projects.id;


--
-- Name: disruptive_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disruptive_scenarios (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    likelihood character varying(50),
    potential_impact text,
    mitigation_strategies text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: disruptive_scenarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.disruptive_scenarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: disruptive_scenarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.disruptive_scenarios_id_seq OWNED BY public.disruptive_scenarios.id;


--
-- Name: dpa_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dpa_templates (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    content text NOT NULL,
    version integer DEFAULT 1,
    is_default boolean DEFAULT false,
    jurisdiction character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: dpa_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dpa_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dpa_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dpa_templates_id_seq OWNED BY public.dpa_templates.id;


--
-- Name: dpia_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dpia_templates (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(100) NOT NULL,
    template_content json,
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: dpia_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dpia_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dpia_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dpia_templates_id_seq OWNED BY public.dpia_templates.id;


--
-- Name: dsar_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsar_requests (
    id integer NOT NULL,
    client_id integer NOT NULL,
    request_id character varying(50) NOT NULL,
    request_type character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'New'::character varying,
    subject_email character varying(255),
    subject_name character varying(255),
    verification_status character varying(50) DEFAULT 'Pending'::character varying,
    request_date timestamp without time zone DEFAULT now(),
    due_date timestamp without time zone,
    completed_date timestamp without time zone,
    assignee_id integer,
    resolution_notes text,
    response_data jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    priority character varying(20) DEFAULT 'medium'::character varying,
    verification_method character varying(100),
    submission_method character varying(50) DEFAULT 'manual'::character varying,
    audit_log jsonb DEFAULT '[]'::jsonb
);


--
-- Name: dsar_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dsar_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dsar_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dsar_requests_id_seq OWNED BY public.dsar_requests.id;


--
-- Name: dsar_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsar_templates (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    request_type character varying(100) NOT NULL,
    template_content json,
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: dsar_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dsar_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dsar_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dsar_templates_id_seq OWNED BY public.dsar_templates.id;


--
-- Name: email_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_messages (
    id integer NOT NULL,
    client_id integer NOT NULL,
    user_id integer,
    folder character varying(20) DEFAULT 'inbox'::character varying,
    status character varying(20) DEFAULT 'draft'::character varying,
    subject character varying(500),
    body text,
    snippet character varying(255),
    "from" character varying(255),
    "to" json,
    cc json,
    bcc json,
    is_read boolean DEFAULT false,
    is_starred boolean DEFAULT false,
    metadata json,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    sent_at timestamp without time zone
);


--
-- Name: email_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_messages_id_seq OWNED BY public.email_messages.id;


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id integer NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    description text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;


--
-- Name: email_triggers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_triggers (
    id integer NOT NULL,
    event_slug character varying(255) NOT NULL,
    template_id integer,
    description text,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: email_triggers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_triggers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_triggers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_triggers_id_seq OWNED BY public.email_triggers.id;


--
-- Name: embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.embeddings (
    id integer NOT NULL,
    doc_id character varying(100) NOT NULL,
    doc_type character varying(50) NOT NULL,
    embedding_data text,
    metadata json,
    created_at timestamp without time zone DEFAULT now(),
    embedding_vector public.vector(1536),
    client_id integer,
    content text,
    entity_type character varying(50),
    entity_id character varying(100),
    embedding public.vector(1536)
);


--
-- Name: COLUMN embeddings.embedding_vector; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.embeddings.embedding_vector IS 'Vector embedding for semantic search (1536 dimensions for OpenAI text-embedding-ada-002)';


--
-- Name: embeddings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.embeddings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: embeddings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.embeddings_id_seq OWNED BY public.embeddings.id;


--
-- Name: employee_acknowledgments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_acknowledgments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    employee_id integer NOT NULL,
    acknowledgment_type character varying(100) NOT NULL,
    acknowledged_at timestamp without time zone DEFAULT now() NOT NULL,
    ip_address character varying(45),
    user_agent text
);


--
-- Name: employee_acknowledgments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_acknowledgments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_acknowledgments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_acknowledgments_id_seq OWNED BY public.employee_acknowledgments.id;


--
-- Name: employee_asset_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_asset_receipts (
    id integer NOT NULL,
    client_id integer NOT NULL,
    employee_id integer NOT NULL,
    asset_type character varying(100) NOT NULL,
    asset_id integer,
    confirmed_at timestamp without time zone,
    notes text,
    status character varying(50) DEFAULT 'assigned'::character varying NOT NULL,
    serial_number character varying(100),
    assigned_at timestamp without time zone DEFAULT now() NOT NULL,
    assigned_by integer,
    expires_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: employee_asset_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_asset_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_asset_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_asset_receipts_id_seq OWNED BY public.employee_asset_receipts.id;


--
-- Name: employee_security_setup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_security_setup (
    id integer NOT NULL,
    client_id integer NOT NULL,
    employee_id integer NOT NULL,
    mfa_enrolled boolean DEFAULT false,
    mfa_enrolled_at timestamp without time zone,
    password_manager_setup boolean DEFAULT false,
    password_manager_setup_at timestamp without time zone,
    security_questions_set boolean DEFAULT false,
    security_questions_set_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: employee_security_setup_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_security_setup_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_security_setup_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_security_setup_id_seq OWNED BY public.employee_security_setup.id;


--
-- Name: employee_task_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_task_assignments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    employee_id integer NOT NULL,
    task_type public.task_type NOT NULL,
    task_id integer NOT NULL,
    raci_role public.raci_role NOT NULL,
    notes text,
    due_date timestamp without time zone,
    assigned_at timestamp without time zone DEFAULT now() NOT NULL,
    assigned_by integer,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: employee_task_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_task_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_task_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_task_assignments_id_seq OWNED BY public.employee_task_assignments.id;


--
-- Name: employee_training_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_training_records (
    id integer NOT NULL,
    client_id integer NOT NULL,
    employee_id integer NOT NULL,
    framework_id character varying(100) NOT NULL,
    section_id character varying(100) NOT NULL,
    completed_at timestamp without time zone NOT NULL,
    completed_by_user_id integer NOT NULL,
    ip_address character varying(50),
    user_agent text,
    time_spent_seconds integer,
    score integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: employee_training_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_training_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_training_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_training_records_id_seq OWNED BY public.employee_training_records.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    client_id integer NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    job_title character varying(255),
    department character varying(255),
    role character varying(255),
    employment_status character varying(50),
    start_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    org_role_id integer,
    manager_id integer
);


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: escalation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escalation_rules (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    trigger public.escalation_trigger NOT NULL,
    entity_type public.governance_entity_type,
    trigger_conditions json,
    actions json DEFAULT '{}'::json,
    work_item_priority public.work_item_priority DEFAULT 'high'::public.work_item_priority,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: escalation_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.escalation_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: escalation_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.escalation_rules_id_seq OWNED BY public.escalation_rules.id;


--
-- Name: essential_eight_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.essential_eight_assessments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    control_id character varying(80) NOT NULL,
    maturity_level integer DEFAULT 0 NOT NULL,
    target_level integer DEFAULT 1 NOT NULL,
    assessment_answers jsonb DEFAULT '{}'::jsonb,
    quality_criteria jsonb DEFAULT '{}'::jsonb,
    level_notes jsonb DEFAULT '{}'::jsonb,
    outcome character varying(30) DEFAULT 'not_assessed'::character varying NOT NULL,
    evidence_quality character varying(20) DEFAULT 'poor'::character varying NOT NULL,
    evidence_quality_by_level jsonb DEFAULT '{}'::jsonb,
    sample_coverage jsonb DEFAULT '{}'::jsonb,
    compensating_controls jsonb DEFAULT '[]'::jsonb,
    evidence_links jsonb DEFAULT '[]'::jsonb,
    notes text,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: essential_eight_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.essential_eight_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: essential_eight_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.essential_eight_assessments_id_seq OWNED BY public.essential_eight_assessments.id;


--
-- Name: evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence (
    id integer NOT NULL,
    client_id integer NOT NULL,
    client_control_id integer NOT NULL,
    evidence_id character varying(50) NOT NULL,
    description text,
    type character varying(100),
    status public.evidence_status DEFAULT 'pending'::public.evidence_status,
    owner character varying(255),
    location character varying(1024),
    last_verified timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    framework character varying(50) DEFAULT 'ISO 27001'::character varying,
    due_date timestamp without time zone,
    file_count integer DEFAULT 0,
    system_id character varying(50),
    expiration_date timestamp without time zone,
    interval_days integer DEFAULT 365
);


--
-- Name: evidence_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_comments (
    id integer NOT NULL,
    evidence_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: evidence_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.evidence_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evidence_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evidence_comments_id_seq OWNED BY public.evidence_comments.id;


--
-- Name: evidence_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_files (
    id integer NOT NULL,
    evidence_id integer NOT NULL,
    filename character varying(255) NOT NULL,
    file_url character varying(1024) NOT NULL,
    file_key character varying(1024) NOT NULL,
    content_type character varying(100),
    file_size integer,
    uploaded_by integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: evidence_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.evidence_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evidence_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evidence_files_id_seq OWNED BY public.evidence_files.id;


--
-- Name: evidence_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.evidence_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evidence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evidence_id_seq OWNED BY public.evidence.id;


--
-- Name: evidence_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_requests (
    id integer NOT NULL,
    client_id integer NOT NULL,
    client_control_id integer NOT NULL,
    requester_id integer NOT NULL,
    assignee_id integer NOT NULL,
    status character varying(50) DEFAULT 'open'::character varying,
    due_date timestamp without time zone,
    description text,
    evidence_id integer,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: evidence_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.evidence_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evidence_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evidence_requests_id_seq OWNED BY public.evidence_requests.id;


--
-- Name: evidence_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_templates (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    control_pattern character varying(255) NOT NULL,
    framework character varying(100),
    category character varying(100),
    suggested_sources json DEFAULT '[]'::json,
    sample_description text,
    integration_type character varying(50) DEFAULT 'manual'::character varying,
    priority integer DEFAULT 50,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: evidence_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.evidence_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evidence_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evidence_templates_id_seq OWNED BY public.evidence_templates.id;


--
-- Name: federal_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_contracts (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    agency_name character varying(255),
    contract_number character varying(255),
    type character varying(50) DEFAULT 'prime'::character varying,
    status character varying(50) DEFAULT 'active'::character varying,
    fisma_system_id integer,
    dfars_7012 boolean DEFAULT false,
    dfars_7019 boolean DEFAULT false,
    dfars_7020 boolean DEFAULT false,
    dfars_7021 boolean DEFAULT false,
    far_52_204_21 boolean DEFAULT false,
    cmmc_level character varying(20),
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: federal_contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_contracts_id_seq OWNED BY public.federal_contracts.id;


--
-- Name: federal_disa_stig_checklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_disa_stig_checklists (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    category character varying(100),
    asset_identifier character varying(255),
    overall_status character varying(50),
    findings_count integer DEFAULT 0,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: federal_disa_stig_checklists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_disa_stig_checklists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_disa_stig_checklists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_disa_stig_checklists_id_seq OWNED BY public.federal_disa_stig_checklists.id;


--
-- Name: federal_disa_stig_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_disa_stig_items (
    id integer NOT NULL,
    checklist_id integer NOT NULL,
    rule_id character varying(50) NOT NULL,
    vuln_id character varying(50),
    title text NOT NULL,
    description text,
    check_text text,
    fix_text text,
    severity character varying(20),
    status character varying(50),
    comments text,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: federal_disa_stig_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_disa_stig_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_disa_stig_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_disa_stig_items_id_seq OWNED BY public.federal_disa_stig_items.id;


--
-- Name: federal_fedramp_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_fedramp_packages (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    impact_level character varying(20),
    authorization_type character varying(50),
    agency_name character varying(255),
    provisioning_status character varying(50),
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: federal_fedramp_packages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_fedramp_packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_fedramp_packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_fedramp_packages_id_seq OWNED BY public.federal_fedramp_packages.id;


--
-- Name: federal_fips_140_module_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_fips_140_module_assets (
    id integer NOT NULL,
    fips_module_id integer NOT NULL,
    asset_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: federal_fips_140_module_assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_fips_140_module_assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_fips_140_module_assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_fips_140_module_assets_id_seq OWNED BY public.federal_fips_140_module_assets.id;


--
-- Name: federal_fips_140_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_fips_140_modules (
    id integer NOT NULL,
    client_id integer NOT NULL,
    module_name character varying(255) NOT NULL,
    vendor character varying(255),
    certificate_number character varying(50),
    validation_level character varying(20),
    validation_version character varying(20),
    status character varying(50),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: federal_fips_140_modules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_fips_140_modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_fips_140_modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_fips_140_modules_id_seq OWNED BY public.federal_fips_140_modules.id;


--
-- Name: federal_fips_categorizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_fips_categorizations (
    id integer NOT NULL,
    ssp_id integer NOT NULL,
    security_objective_confidentiality character varying(20) DEFAULT 'low'::character varying,
    security_objective_integrity character varying(20) DEFAULT 'low'::character varying,
    security_objective_availability character varying(20) DEFAULT 'low'::character varying,
    rationale_confidentiality text,
    rationale_integrity text,
    rationale_availability text,
    information_types jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp without time zone DEFAULT now(),
    fisma_system_id integer
);


--
-- Name: federal_fips_categorizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_fips_categorizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_fips_categorizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_fips_categorizations_id_seq OWNED BY public.federal_fips_categorizations.id;


--
-- Name: federal_fisma_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_fisma_reports (
    id integer NOT NULL,
    client_id integer NOT NULL,
    reporting_period character varying(100),
    system_impact character varying(20),
    overall_status character varying(50),
    metrics json,
    updated_at timestamp without time zone DEFAULT now(),
    fisma_system_id integer
);


--
-- Name: federal_fisma_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_fisma_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_fisma_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_fisma_reports_id_seq OWNED BY public.federal_fisma_reports.id;


--
-- Name: federal_fisma_systems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_fisma_systems (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    fips_199_overall character varying(20),
    description text,
    status character varying(50),
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    acronym character varying(20),
    owner character varying(255),
    controls_count integer DEFAULT 0,
    assets_count integer DEFAULT 0
);


--
-- Name: federal_fisma_systems_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_fisma_systems_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_fisma_systems_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_fisma_systems_id_seq OWNED BY public.federal_fisma_systems.id;


--
-- Name: federal_inheritances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_inheritances (
    id integer NOT NULL,
    client_id integer NOT NULL,
    package_id integer NOT NULL,
    partner_name character varying(255) NOT NULL,
    control_id character varying(100) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    fisma_system_id integer
);


--
-- Name: federal_inheritances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_inheritances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_inheritances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_inheritances_id_seq OWNED BY public.federal_inheritances.id;


--
-- Name: federal_nist_800_53_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_nist_800_53_assessments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    ssp_id integer,
    control_id character varying(50) NOT NULL,
    implementation_status character varying(50),
    implementation_description text,
    test_results text,
    compliance_status character varying(50),
    updated_at timestamp without time zone DEFAULT now(),
    fisma_system_id integer,
    sprs_assessment_id integer,
    rmf_workflow_id integer
);


--
-- Name: federal_nist_800_53_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_nist_800_53_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_nist_800_53_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_nist_800_53_assessments_id_seq OWNED BY public.federal_nist_800_53_assessments.id;


--
-- Name: federal_poams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_poams (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    source_ssp_id integer,
    status character varying(50) DEFAULT 'active'::character varying,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    fisma_system_id integer
);


--
-- Name: federal_poams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_poams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_poams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_poams_id_seq OWNED BY public.federal_poams.id;


--
-- Name: federal_rmf_workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_rmf_workflows (
    id integer NOT NULL,
    client_id integer NOT NULL,
    system_name character varying(255) NOT NULL,
    current_step integer DEFAULT 1,
    step_status json,
    updated_at timestamp without time zone DEFAULT now(),
    fisma_system_id integer
);


--
-- Name: federal_rmf_workflows_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_rmf_workflows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_rmf_workflows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_rmf_workflows_id_seq OWNED BY public.federal_rmf_workflows.id;


--
-- Name: federal_sar_findings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_sar_findings (
    id integer NOT NULL,
    sar_id integer NOT NULL,
    control_id character varying(50) NOT NULL,
    result character varying(50) DEFAULT 'other_than_satisfied'::character varying,
    observation text,
    risk_level character varying(20),
    remediation_plan text,
    updated_at timestamp without time zone DEFAULT now(),
    "overlay" character varying(100),
    na_justification text,
    vulnerability_summary text,
    vulnerability_severity character varying(20),
    residual_risk_level character varying(20),
    recommendations text,
    fisma_system_id integer
);


--
-- Name: federal_sar_findings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_sar_findings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_sar_findings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_sar_findings_id_seq OWNED BY public.federal_sar_findings.id;


--
-- Name: federal_sars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_sars (
    id integer NOT NULL,
    client_id integer NOT NULL,
    ssp_id integer,
    title character varying(255) NOT NULL,
    assessor_name character varying(255),
    assessment_date timestamp without time zone,
    summary_of_findings text,
    risk_executive_summary text,
    status character varying(50) DEFAULT 'draft'::character varying,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    system_acronym character varying(50),
    system_identification character varying(255),
    system_type character varying(50),
    version character varying(50),
    agency character varying(100),
    assessment_completion_date timestamp without time zone,
    system_owner_id integer,
    confidentiality character varying(20),
    integrity character varying(20),
    availability character varying(20),
    impact character varying(20),
    package_type character varying(100),
    executive_summary text,
    fisma_system_id integer
);


--
-- Name: federal_sars_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_sars_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_sars_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_sars_id_seq OWNED BY public.federal_sars.id;


--
-- Name: federal_sprs_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_sprs_assessments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    score integer DEFAULT 110,
    assessment_date timestamp without time zone DEFAULT now(),
    scope_description text,
    updated_at timestamp without time zone DEFAULT now(),
    status character varying(50) DEFAULT 'Active'::character varying
);


--
-- Name: federal_sprs_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_sprs_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_sprs_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_sprs_assessments_id_seq OWNED BY public.federal_sprs_assessments.id;


--
-- Name: federal_ssp_controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_ssp_controls (
    id integer NOT NULL,
    ssp_id integer NOT NULL,
    control_id character varying(50) NOT NULL,
    implementation_status character varying(50) DEFAULT 'not_implemented'::character varying,
    implementation_description text,
    responsible_role character varying(255),
    updated_at timestamp without time zone DEFAULT now(),
    evidence_links jsonb DEFAULT '[]'::jsonb,
    fisma_system_id integer
);


--
-- Name: federal_ssp_controls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_ssp_controls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_ssp_controls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_ssp_controls_id_seq OWNED BY public.federal_ssp_controls.id;


--
-- Name: federal_ssp_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_ssp_sections (
    id integer NOT NULL,
    ssp_id integer NOT NULL,
    section_key character varying(100) NOT NULL,
    content json,
    updated_at timestamp without time zone DEFAULT now(),
    fisma_system_id integer
);


--
-- Name: federal_ssp_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_ssp_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_ssp_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_ssp_sections_id_seq OWNED BY public.federal_ssp_sections.id;


--
-- Name: federal_ssps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_ssps (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    framework character varying(50) NOT NULL,
    system_name character varying(255),
    system_type character varying(255),
    boundary_description text,
    responsible_role character varying(255),
    status character varying(50) DEFAULT 'draft'::character varying,
    version integer DEFAULT 1,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    content text DEFAULT '{}'::text,
    fisma_system_id integer
);


--
-- Name: federal_ssps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.federal_ssps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: federal_ssps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.federal_ssps_id_seq OWNED BY public.federal_ssps.id;


--
-- Name: financial_impacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_impacts (
    id integer NOT NULL,
    bia_id integer NOT NULL,
    loss_category character varying(100) NOT NULL,
    amount_per_unit integer,
    unit character varying(50),
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: financial_impacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.financial_impacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: financial_impacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.financial_impacts_id_seq OWNED BY public.financial_impacts.id;


--
-- Name: fips_199_information_types_ref; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fips_199_information_types_ref (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(100),
    provisional_confidentiality character varying(20) NOT NULL,
    provisional_integrity character varying(20) NOT NULL,
    provisional_availability character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: fips_199_information_types_ref_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fips_199_information_types_ref_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fips_199_information_types_ref_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fips_199_information_types_ref_id_seq OWNED BY public.fips_199_information_types_ref.id;


--
-- Name: fips_categorizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fips_categorizations (
    id integer NOT NULL,
    client_id integer NOT NULL,
    system_name character varying(255),
    information_types jsonb,
    confidentiality_impact character varying(20),
    integrity_impact character varying(20),
    availability_impact character varying(20),
    high_water_mark character varying(20),
    status character varying(50) DEFAULT 'draft'::character varying,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    fisma_system_id integer,
    confidentiality_rationale text,
    integrity_rationale text,
    availability_rationale text,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: fips_categorizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fips_categorizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fips_categorizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fips_categorizations_id_seq OWNED BY public.fips_categorizations.id;


--
-- Name: flood_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flood_id (
    id integer
);


--
-- Name: fms_poam_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fms_poam_id (
    id integer
);


--
-- Name: framework_knowledge_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.framework_knowledge_mappings (
    id integer NOT NULL,
    source_requirement_id integer NOT NULL,
    target_type character varying(50) NOT NULL,
    target_value character varying(255) NOT NULL,
    mapping_weight integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: framework_knowledge_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.framework_knowledge_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: framework_knowledge_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.framework_knowledge_mappings_id_seq OWNED BY public.framework_knowledge_mappings.id;


--
-- Name: framework_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.framework_mappings (
    id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    source_framework_id integer,
    source_requirement_id integer,
    target_framework_id integer,
    target_requirement_id integer,
    strength character varying(50) DEFAULT 'related'::character varying,
    justification text,
    common_control_id integer,
    created_by_id integer
);


--
-- Name: framework_mappings_deprecated; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.framework_mappings_deprecated (
    id integer NOT NULL,
    source_control_id integer NOT NULL,
    target_control_id integer NOT NULL,
    mapping_type character varying(50) DEFAULT 'equivalent'::character varying,
    notes text,
    confidence integer,
    status character varying(50) DEFAULT 'approved'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: framework_mappings_deprecated_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.framework_mappings_deprecated_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: framework_mappings_deprecated_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.framework_mappings_deprecated_id_seq OWNED BY public.framework_mappings_deprecated.id;


--
-- Name: framework_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.framework_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: framework_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.framework_mappings_id_seq OWNED BY public.framework_mappings.id;


--
-- Name: framework_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.framework_requirements (
    id integer NOT NULL,
    framework_id integer NOT NULL,
    phase_id integer,
    identifier character varying(100) NOT NULL,
    title character varying(500) NOT NULL,
    description text,
    guidance text,
    mapping_tags json,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: framework_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.framework_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: framework_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.framework_requirements_id_seq OWNED BY public.framework_requirements.id;


--
-- Name: gap_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gap_assessments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    framework character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying,
    scope text,
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    assignees json,
    executive_summary text,
    introduction text,
    key_recommendations json,
    methodology text,
    assumptions text,
    "references" text
);


--
-- Name: gap_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gap_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gap_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gap_assessments_id_seq OWNED BY public.gap_assessments.id;


--
-- Name: gap_questionnaire_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gap_questionnaire_requests (
    id integer NOT NULL,
    assessment_id integer NOT NULL,
    token character varying(64) NOT NULL,
    recipient_email character varying(255) NOT NULL,
    recipient_name character varying(255),
    control_ids json DEFAULT '[]'::json,
    message text,
    status character varying(20) DEFAULT 'pending'::character varying,
    sent_at timestamp without time zone,
    expires_at timestamp without time zone,
    viewed_at timestamp without time zone,
    completed_at timestamp without time zone,
    responses json DEFAULT '[]'::json,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    applied_at timestamp without time zone,
    archived_at timestamp without time zone,
    respondent_name character varying(255)
);


--
-- Name: gap_questionnaire_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gap_questionnaire_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gap_questionnaire_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gap_questionnaire_requests_id_seq OWNED BY public.gap_questionnaire_requests.id;


--
-- Name: gap_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gap_responses (
    id integer NOT NULL,
    assessment_id integer NOT NULL,
    control_id character varying(100) NOT NULL,
    current_status character varying(50),
    target_status character varying(50),
    notes text,
    evidence_links json,
    remediation_plan text,
    gap_severity character varying(20),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    priority_score integer,
    priority_reason text
);


--
-- Name: gap_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gap_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gap_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gap_responses_id_seq OWNED BY public.gap_responses.id;


--
-- Name: global_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_contacts (
    id integer NOT NULL,
    first_name character varying(255),
    last_name character varying(255),
    email character varying(255) NOT NULL,
    company character varying(255),
    role character varying(255),
    phone character varying(50),
    source character varying(50) DEFAULT 'manual'::character varying,
    status character varying(50) DEFAULT 'lead'::character varying,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: global_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.global_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: global_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.global_contacts_id_seq OWNED BY public.global_contacts.id;


--
-- Name: global_crm_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_crm_activities (
    id integer NOT NULL,
    contact_id integer NOT NULL,
    type character varying(50) NOT NULL,
    subject character varying(255),
    description text,
    outcome character varying(100),
    scheduled_at timestamp without time zone,
    completed_at timestamp without time zone,
    duration integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: global_crm_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.global_crm_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: global_crm_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.global_crm_activities_id_seq OWNED BY public.global_crm_activities.id;


--
-- Name: global_crm_contact_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_crm_contact_tags (
    id integer NOT NULL,
    contact_id integer NOT NULL,
    tag_id integer NOT NULL
);


--
-- Name: global_crm_contact_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.global_crm_contact_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: global_crm_contact_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.global_crm_contact_tags_id_seq OWNED BY public.global_crm_contact_tags.id;


--
-- Name: global_crm_deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_crm_deals (
    id integer NOT NULL,
    contact_id integer NOT NULL,
    name character varying(255) NOT NULL,
    value integer NOT NULL,
    probability integer DEFAULT 0,
    stage character varying(50) NOT NULL,
    expected_close_date timestamp without time zone,
    description text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: global_crm_deals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.global_crm_deals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: global_crm_deals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.global_crm_deals_id_seq OWNED BY public.global_crm_deals.id;


--
-- Name: global_crm_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_crm_notes (
    id integer NOT NULL,
    contact_id integer NOT NULL,
    content text NOT NULL,
    is_pinned boolean DEFAULT false,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: global_crm_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.global_crm_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: global_crm_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.global_crm_notes_id_seq OWNED BY public.global_crm_notes.id;


--
-- Name: global_crm_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_crm_tags (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    color character varying(20),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: global_crm_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.global_crm_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: global_crm_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.global_crm_tags_id_seq OWNED BY public.global_crm_tags.id;


--
-- Name: global_vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_vendors (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    website character varying(512),
    trust_center_url character varying(512),
    platform character varying(100),
    favicon_url character varying(512),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: global_vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.global_vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: global_vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.global_vendors_id_seq OWNED BY public.global_vendors.id;


--
-- Name: governance_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.governance_events (
    id integer NOT NULL,
    client_id integer NOT NULL,
    entity_type public.governance_entity_type NOT NULL,
    entity_id integer NOT NULL,
    entity_name character varying(500),
    event_type character varying(100) NOT NULL,
    from_state character varying(100),
    to_state character varying(100),
    action character varying(100),
    actor_user_id integer,
    actor_name character varying(255),
    metadata json,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: governance_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.governance_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: governance_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.governance_events_id_seq OWNED BY public.governance_events.id;


--
-- Name: gumroad_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gumroad_webhook_events (
    id integer NOT NULL,
    event_id character varying(255) NOT NULL,
    event_type character varying(100) NOT NULL,
    resource_name character varying(100),
    gumroad_timestamp character varying(50),
    gumroad_signature character varying(255),
    raw_payload jsonb NOT NULL,
    processed_payload jsonb,
    processing_status character varying(50) DEFAULT 'pending'::character varying,
    processing_attempts integer DEFAULT 0,
    processing_error text,
    processed_at timestamp without time zone,
    license_key character varying(255),
    product_id character varying(100),
    purchase_id character varying(255),
    subscription_id character varying(255),
    received_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: gumroad_webhook_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gumroad_webhook_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gumroad_webhook_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gumroad_webhook_events_id_seq OWNED BY public.gumroad_webhook_events.id;


--
-- Name: hris_poam_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hris_poam_id (
    id integer
);


--
-- Name: impact_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.impact_assessments (
    id integer NOT NULL,
    bia_id integer NOT NULL,
    time_interval character varying(50) NOT NULL,
    financial_rating integer,
    operational_rating integer,
    reputation_rating integer,
    legal_rating integer,
    financial_value character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: impact_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.impact_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: impact_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.impact_assessments_id_seq OWNED BY public.impact_assessments.id;


--
-- Name: implementation_phases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.implementation_phases (
    id integer NOT NULL,
    framework_id integer NOT NULL,
    name character varying(255) NOT NULL,
    "order" integer NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: implementation_phases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.implementation_phases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: implementation_phases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.implementation_phases_id_seq OWNED BY public.implementation_phases.id;


--
-- Name: implementation_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.implementation_plans (
    id integer NOT NULL,
    client_id integer NOT NULL,
    roadmap_id integer,
    title character varying(255) NOT NULL,
    description text,
    status public.implementation_status DEFAULT 'not_started'::public.implementation_status,
    priority character varying(50) DEFAULT 'medium'::character varying,
    planned_start_date timestamp without time zone,
    planned_end_date timestamp without time zone,
    actual_start_date timestamp without time zone,
    actual_end_date timestamp without time zone,
    estimated_hours integer,
    actual_hours integer,
    budget_amount integer,
    actual_cost integer,
    project_manager_id integer,
    team_member_ids json,
    linked_framework character varying(100),
    linked_controls json,
    risk_mitigation_focus json,
    prerequisites json,
    blocked_by json,
    created_by_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    framework_id integer,
    custom_framework_name character varying(255),
    harmonization_source_ids json
);


--
-- Name: implementation_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.implementation_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: implementation_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.implementation_plans_id_seq OWNED BY public.implementation_plans.id;


--
-- Name: implementation_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.implementation_progress (
    id integer NOT NULL,
    implementation_plan_id integer NOT NULL,
    completed_tasks_count integer DEFAULT 0,
    total_tasks_count integer DEFAULT 0,
    overall_progress_percentage integer DEFAULT 0,
    status_change_date timestamp without time zone DEFAULT now(),
    previous_status character varying(50),
    new_status character varying(50),
    affected_milestone_ids json,
    milestone_progress_updates json,
    workflows_completed_count integer DEFAULT 0,
    workflows_blocked_count integer DEFAULT 0,
    quality_score integer,
    adherence_score integer,
    reported_by_id integer NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: implementation_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.implementation_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: implementation_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.implementation_progress_id_seq OWNED BY public.implementation_progress.id;


--
-- Name: implementation_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.implementation_tasks (
    id integer NOT NULL,
    implementation_plan_id integer NOT NULL,
    title character varying(500) NOT NULL,
    description text,
    status public.kanban_status DEFAULT 'todo'::public.kanban_status,
    progress_percentage integer DEFAULT 0,
    assignee_id integer,
    reviewer_id integer,
    estimated_hours integer,
    actual_hours integer,
    planned_start_date timestamp without time zone,
    planned_end_date timestamp without time zone,
    actual_start_date timestamp without time zone,
    actual_end_date timestamp without time zone,
    dependencies json,
    blocked_by json,
    acceptance_criteria text,
    deliverables json,
    evidence_required json,
    risk_mitigation text,
    control_id character varying(100),
    tags json,
    priority character varying(50) DEFAULT 'medium'::character varying,
    created_by_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    pdca character varying(100),
    nist character varying(50),
    subtasks json
);


--
-- Name: implementation_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.implementation_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: implementation_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.implementation_tasks_id_seq OWNED BY public.implementation_tasks.id;


--
-- Name: implementation_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.implementation_templates (
    id integer NOT NULL,
    client_id integer,
    title character varying(255) NOT NULL,
    description text,
    estimated_hours integer DEFAULT 0,
    priority character varying(50) DEFAULT 'medium'::character varying,
    category character varying(100),
    tasks jsonb DEFAULT '[]'::jsonb,
    risk_mitigation_focus jsonb DEFAULT '[]'::jsonb,
    is_system boolean DEFAULT false,
    created_by_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: implementation_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.implementation_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: implementation_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.implementation_templates_id_seq OWNED BY public.implementation_templates.id;


--
-- Name: incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incidents (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) DEFAULT 'Untitled Incident'::character varying NOT NULL,
    detected_at timestamp without time zone,
    severity public.incident_severity DEFAULT 'low'::public.incident_severity,
    cause character varying(100),
    description text,
    affected_assets text,
    cross_border_impact boolean DEFAULT false,
    status public.incident_status DEFAULT 'open'::public.incident_status,
    reported_to_authorities boolean DEFAULT false,
    reporter_name character varying(255),
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    is_significant boolean DEFAULT false,
    significance_criteria jsonb,
    affected_users_count integer DEFAULT 0,
    service_disruption_duration integer DEFAULT 0,
    estimated_financial_loss integer DEFAULT 0,
    is_continuity_triggered boolean DEFAULT false,
    early_warning_sent_at timestamp without time zone,
    intermediate_report_sent_at timestamp without time zone,
    final_report_sent_at timestamp without time zone
);


--
-- Name: incidents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.incidents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: incidents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.incidents_id_seq OWNED BY public.incidents.id;


--
-- Name: insider_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insider_id (
    id integer
);


--
-- Name: intake_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intake_items (
    id integer NOT NULL,
    client_id integer NOT NULL,
    filename character varying(255) NOT NULL,
    file_url character varying(1024) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    classification character varying(255),
    confidence integer,
    details json,
    uploaded_by integer,
    processed_by integer,
    mapped_evidence_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    file_key character varying(500)
);


--
-- Name: intake_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.intake_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: intake_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.intake_items_id_seq OWNED BY public.intake_items.id;


--
-- Name: integration_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_definitions (
    id integer NOT NULL,
    provider character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    scopes text,
    redirect_uri text,
    is_active boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer
);


--
-- Name: integration_definitions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integration_definitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integration_definitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integration_definitions_id_seq OWNED BY public.integration_definitions.id;


--
-- Name: integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integrations (
    id integer NOT NULL,
    client_id integer NOT NULL,
    provider character varying(50) NOT NULL,
    access_token text,
    refresh_token text,
    expires_at timestamp without time zone,
    external_account_id character varying(255),
    scopes json,
    metadata json,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integrations_id_seq OWNED BY public.integrations.id;


--
-- Name: international_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.international_transfers (
    id integer NOT NULL,
    client_id integer NOT NULL,
    activity_id integer,
    vendor_id integer,
    title character varying(255) NOT NULL,
    destination_country_code character varying(2) NOT NULL,
    transfer_tool public.transfer_tool NOT NULL,
    scc_module public.scc_module,
    status public.international_transfer_status DEFAULT 'pending'::public.international_transfer_status,
    next_review_date timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: international_transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.international_transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: international_transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.international_transfers_id_seq OWNED BY public.international_transfers.id;


--
-- Name: issue_tracker_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue_tracker_connections (
    id integer NOT NULL,
    client_id integer NOT NULL,
    provider character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    base_url character varying(1024),
    credentials text NOT NULL,
    project_key character varying(100),
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: issue_tracker_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.issue_tracker_connections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: issue_tracker_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.issue_tracker_connections_id_seq OWNED BY public.issue_tracker_connections.id;


--
-- Name: knowledge_articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_articles (
    id integer NOT NULL,
    title character varying(500) NOT NULL,
    body text NOT NULL,
    tags json,
    source character varying(255),
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: knowledge_articles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.knowledge_articles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knowledge_articles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.knowledge_articles_id_seq OWNED BY public.knowledge_articles.id;


--
-- Name: knowledge_base_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_base_entries (
    id integer NOT NULL,
    client_id integer NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    tags json DEFAULT '[]'::json,
    access character varying(50) DEFAULT 'internal'::character varying,
    assignee_id integer,
    health character varying(50),
    comments text,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: knowledge_base_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.knowledge_base_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knowledge_base_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.knowledge_base_entries_id_seq OWNED BY public.knowledge_base_entries.id;


--
-- Name: kris; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kris (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'active'::character varying,
    threshold_green text,
    threshold_amber text,
    threshold_red text,
    current_value text,
    current_status character varying(50) DEFAULT 'green'::character varying,
    owner character varying(255),
    last_updated timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: kris_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kris_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kris_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kris_id_seq OWNED BY public.kris.id;


--
-- Name: license_activations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.license_activations (
    id integer NOT NULL,
    license_key character varying(255) NOT NULL,
    license_type character varying(50) DEFAULT 'community'::character varying NOT NULL,
    license_status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    product_id character varying(100),
    product_permalink character varying(255),
    product_name character varying(255),
    customer_email character varying(255),
    customer_name character varying(255),
    client_id integer,
    user_id integer,
    activation_ip character varying(45),
    max_users integer DEFAULT 10,
    max_clients integer DEFAULT 5,
    max_features integer DEFAULT 0,
    issued_at timestamp without time zone DEFAULT now(),
    activated_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone,
    renewed_at timestamp without time zone,
    subscription_id character varying(255),
    is_recurring boolean DEFAULT false,
    recurrence_period character varying(50),
    enabled_features jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    gumroad_purchase_id character varying(255),
    gumroad_sale_id character varying(255),
    gumroad_validation_data jsonb,
    last_validated_at timestamp without time zone,
    validation_count integer DEFAULT 0,
    last_validation_result jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: license_activations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.license_activations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: license_activations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.license_activations_id_seq OWNED BY public.license_activations.id;


--
-- Name: license_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.license_configurations (
    id integer NOT NULL,
    config_type character varying(50) NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value jsonb,
    build_type character varying(50),
    license_type character varying(50),
    feature_id character varying(100),
    description text,
    is_enabled boolean DEFAULT true,
    priority integer DEFAULT 0,
    valid_from timestamp without time zone DEFAULT now(),
    valid_until timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: license_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.license_configurations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: license_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.license_configurations_id_seq OWNED BY public.license_configurations.id;


--
-- Name: license_feature_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.license_feature_usage (
    id integer NOT NULL,
    license_activation_id integer NOT NULL,
    client_id integer NOT NULL,
    user_id integer,
    feature_id character varying(100) NOT NULL,
    feature_name character varying(255),
    feature_category character varying(100),
    usage_count integer DEFAULT 1,
    last_used_at timestamp without time zone DEFAULT now(),
    first_used_at timestamp without time zone DEFAULT now(),
    usage_context jsonb,
    resource_id character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: license_feature_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.license_feature_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: license_feature_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.license_feature_usage_id_seq OWNED BY public.license_feature_usage.id;


--
-- Name: license_status_enum; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.license_status_enum (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text
);


--
-- Name: license_status_enum_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.license_status_enum_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: license_status_enum_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.license_status_enum_id_seq OWNED BY public.license_status_enum.id;


--
-- Name: license_type_enum; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.license_type_enum (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text
);


--
-- Name: license_type_enum_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.license_type_enum_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: license_type_enum_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.license_type_enum_id_seq OWNED BY public.license_type_enum.id;


--
-- Name: license_validation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.license_validation_logs (
    id integer NOT NULL,
    license_activation_id integer,
    license_key character varying(255),
    client_id integer,
    user_id integer,
    request_ip character varying(45),
    user_agent text,
    requested_features jsonb,
    validation_type character varying(50),
    is_valid boolean NOT NULL,
    validation_result jsonb,
    error_message text,
    missing_features jsonb,
    validation_duration_ms integer,
    cache_hit boolean DEFAULT false,
    external_validation boolean DEFAULT false,
    external_service character varying(50),
    external_response jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: license_validation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.license_validation_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: license_validation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.license_validation_logs_id_seq OWNED BY public.license_validation_logs.id;


--
-- Name: llm_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.llm_providers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    provider character varying(50) NOT NULL,
    model character varying(100) NOT NULL,
    api_key text NOT NULL,
    base_url character varying(512),
    priority integer DEFAULT 0,
    is_enabled boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    supports_embeddings boolean DEFAULT false
);


--
-- Name: llm_providers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.llm_providers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: llm_providers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.llm_providers_id_seq OWNED BY public.llm_providers.id;


--
-- Name: llm_router_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.llm_router_rules (
    id integer NOT NULL,
    feature character varying(100) NOT NULL,
    provider_id integer,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: llm_router_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.llm_router_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: llm_router_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.llm_router_rules_id_seq OWNED BY public.llm_router_rules.id;


--
-- Name: magic_link_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_link_redemptions (
    id integer NOT NULL,
    magic_link_id integer NOT NULL,
    user_id integer NOT NULL,
    redeemed_at timestamp without time zone DEFAULT now()
);


--
-- Name: magic_link_redemptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.magic_link_redemptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: magic_link_redemptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.magic_link_redemptions_id_seq OWNED BY public.magic_link_redemptions.id;


--
-- Name: magic_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_links (
    id integer NOT NULL,
    token character varying(255) NOT NULL,
    label character varying(255),
    email character varying(255),
    role character varying(50) DEFAULT 'viewer'::character varying,
    plan_tier character varying(50) DEFAULT 'free'::character varying,
    max_clients integer DEFAULT 2,
    access_duration_type character varying(50),
    access_duration_days integer,
    waitlist_id integer,
    status character varying(50) DEFAULT 'active'::character varying,
    created_by_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone,
    used_at timestamp without time zone,
    used_by_user_id integer,
    usage_limit integer DEFAULT 1,
    use_count integer DEFAULT 0,
    restricted_domains jsonb
);


--
-- Name: magic_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.magic_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: magic_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.magic_links_id_seq OWNED BY public.magic_links.id;


--
-- Name: maturity_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maturity_assessments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    framework_id character varying(50) NOT NULL,
    requirement_id integer NOT NULL,
    is_achieved boolean DEFAULT false,
    notes text,
    evidence jsonb DEFAULT '[]'::jsonb,
    is_target boolean DEFAULT false,
    assessed_by integer,
    assessment_date timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: maturity_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maturity_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maturity_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maturity_assessments_id_seq OWNED BY public.maturity_assessments.id;


--
-- Name: maturity_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maturity_categories (
    id integer NOT NULL,
    framework_id character varying(50) NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    icon character varying(50),
    "order" integer DEFAULT 0,
    parent_id integer
);


--
-- Name: maturity_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maturity_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maturity_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maturity_categories_id_seq OWNED BY public.maturity_categories.id;


--
-- Name: maturity_client_frameworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maturity_client_frameworks (
    id integer NOT NULL,
    client_id integer NOT NULL,
    framework_id character varying(50) NOT NULL,
    overall_score integer DEFAULT 0,
    target_score integer DEFAULT 0,
    status character varying(20) DEFAULT 'not_started'::character varying,
    last_assessed_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: maturity_client_frameworks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maturity_client_frameworks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maturity_client_frameworks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maturity_client_frameworks_id_seq OWNED BY public.maturity_client_frameworks.id;


--
-- Name: maturity_frameworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maturity_frameworks (
    id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    version character varying(20),
    logo character varying(255),
    levels jsonb NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: maturity_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maturity_requirements (
    id integer NOT NULL,
    framework_id character varying(50) NOT NULL,
    category_id integer NOT NULL,
    code character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    level integer NOT NULL,
    "order" integer DEFAULT 0,
    benefits text,
    activities jsonb DEFAULT '[]'::jsonb
);


--
-- Name: maturity_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maturity_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maturity_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maturity_requirements_id_seq OWNED BY public.maturity_requirements.id;


--
-- Name: maturity_simulations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maturity_simulations (
    id integer NOT NULL,
    client_id integer NOT NULL,
    framework_id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    config jsonb NOT NULL,
    results jsonb,
    created_at timestamp without time zone DEFAULT now(),
    created_by integer
);


--
-- Name: maturity_simulations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maturity_simulations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maturity_simulations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maturity_simulations_id_seq OWNED BY public.maturity_simulations.id;


--
-- Name: nda_signatures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nda_signatures (
    id integer NOT NULL,
    client_id integer NOT NULL,
    visitor_id integer NOT NULL,
    nda_version character varying(50) DEFAULT 'v1.0'::character varying,
    signed_at timestamp without time zone DEFAULT now(),
    signature_text character varying(255),
    ip_address character varying(50)
);


--
-- Name: nda_signatures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nda_signatures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nda_signatures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nda_signatures_id_seq OWNED BY public.nda_signatures.id;


--
-- Name: net_deg_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.net_deg_id (
    id integer
);


--
-- Name: nis2_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nis2_mappings (
    id integer NOT NULL,
    nis2_article character varying(50) NOT NULL,
    enisa_measure_id character varying(20) NOT NULL,
    enisa_measure_title character varying(255) NOT NULL,
    iso27001_control_ids json NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    nist_csf_control_ids jsonb,
    soc2_control_ids jsonb,
    pci_dss_control_ids jsonb
);


--
-- Name: nis2_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nis2_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nis2_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nis2_mappings_id_seq OWNED BY public.nis2_mappings.id;


--
-- Name: nist_80030_impact_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nist_80030_impact_assessments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    domain character varying(255) NOT NULL,
    cia_type character varying(50),
    magnitude character varying(50) NOT NULL,
    magnitude_score integer DEFAULT 0,
    description text,
    rationale text,
    factor_name character varying(255),
    factor_level character varying(50),
    factor_type character varying(50),
    factor_description text,
    estimated_daily_impact integer,
    revenue_loss_pct integer,
    legal_fines_pct integer,
    brand_equity_pct integer,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    fisma_system_id integer
);


--
-- Name: nist_80030_impact_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nist_80030_impact_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nist_80030_impact_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nist_80030_impact_assessments_id_seq OWNED BY public.nist_80030_impact_assessments.id;


--
-- Name: nist_80030_threat_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nist_80030_threat_events (
    id integer NOT NULL,
    client_id integer NOT NULL,
    threat_source_id integer,
    event_id character varying(50),
    name character varying(500) NOT NULL,
    description text,
    source_type character varying(100),
    relevance character varying(50),
    likelihood character varying(50),
    vulnerabilities_predispositions text,
    targeted_assets text,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    fisma_system_id integer
);


--
-- Name: nist_80030_threat_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nist_80030_threat_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nist_80030_threat_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nist_80030_threat_events_id_seq OWNED BY public.nist_80030_threat_events.id;


--
-- Name: nist_80030_threat_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nist_80030_threat_sources (
    id integer NOT NULL,
    client_id integer NOT NULL,
    type character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    capability character varying(50),
    intent character varying(50),
    targeting character varying(50),
    motive character varying(255),
    range_of_effects character varying(255),
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    fisma_system_id integer
);


--
-- Name: nist_80030_threat_sources_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nist_80030_threat_sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nist_80030_threat_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nist_80030_threat_sources_id_seq OWNED BY public.nist_80030_threat_sources.id;


--
-- Name: nist_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nist_tiers (
    id integer NOT NULL,
    client_id integer NOT NULL,
    function_code character varying(20) NOT NULL,
    current_tier integer DEFAULT 1,
    target_tier integer DEFAULT 1,
    updated_at timestamp without time zone DEFAULT now(),
    fisma_system_id integer
);


--
-- Name: nist_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nist_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nist_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nist_tiers_id_seq OWNED BY public.nist_tiers.id;


--
-- Name: notification_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_log (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(50),
    title character varying(255),
    message text,
    sent_at timestamp without time zone DEFAULT now(),
    channel character varying(20) DEFAULT 'email'::character varying,
    status character varying(20) DEFAULT 'sent'::character varying,
    metadata json,
    related_entity_type character varying(50),
    related_entity_id integer,
    read_at timestamp without time zone,
    link text
);


--
-- Name: notification_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_log_id_seq OWNED BY public.notification_log.id;


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_settings (
    id integer NOT NULL,
    email_enabled boolean DEFAULT true,
    overdue_enabled boolean DEFAULT true,
    daily_digest_enabled boolean DEFAULT false,
    weekly_digest_enabled boolean DEFAULT true,
    upcoming_review_days integer DEFAULT 7,
    notify_control_reviews boolean DEFAULT true,
    notify_policy_renewals boolean DEFAULT true,
    notify_evidence_expiration boolean DEFAULT true,
    notify_risk_reviews boolean DEFAULT true,
    client_id integer NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_settings_id_seq OWNED BY public.notification_settings.id;


--
-- Name: nvd_cve_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nvd_cve_cache (
    id integer NOT NULL,
    cve_id character varying(50) NOT NULL,
    cvss_score character varying(10),
    cvss_vector character varying(255),
    cwe_ids json,
    description text,
    published_date timestamp without time zone,
    last_modified_date timestamp without time zone,
    affected_products json,
    "references" json,
    raw_data json,
    fetched_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone
);


--
-- Name: nvd_cve_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nvd_cve_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nvd_cve_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nvd_cve_cache_id_seq OWNED BY public.nvd_cve_cache.id;


--
-- Name: org_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_roles (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    responsibilities text,
    department character varying(255),
    reporting_role_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: org_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.org_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: org_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.org_roles_id_seq OWNED BY public.org_roles.id;


--
-- Name: plan_change_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_change_log (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    user_id integer NOT NULL,
    action character varying(50) NOT NULL,
    details text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: plan_change_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_change_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_change_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_change_log_id_seq OWNED BY public.plan_change_log.id;


--
-- Name: plan_exercises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_exercises (
    id integer NOT NULL,
    client_id integer NOT NULL,
    plan_id integer NOT NULL,
    title character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    conductor_id integer,
    status character varying(50) DEFAULT 'planned'::character varying,
    outcome character varying(50),
    notes text,
    follow_up_tasks json,
    report_url character varying(1024),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    start_date timestamp without time zone DEFAULT now()
);


--
-- Name: plan_exercises_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_exercises_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_exercises_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_exercises_id_seq OWNED BY public.plan_exercises.id;


--
-- Name: plan_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_versions (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    version character varying(50) NOT NULL,
    content_snapshot json,
    change_summary text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: plan_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_versions_id_seq OWNED BY public.plan_versions.id;


--
-- Name: poam_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.poam_items (
    id integer NOT NULL,
    poam_id integer NOT NULL,
    control_id character varying(100),
    weakness_name character varying(500),
    weakness_description text,
    point_of_contact character varying(255),
    resources_required text,
    scheduled_completion_date timestamp without time zone,
    milestones json,
    status character varying(50) DEFAULT 'open'::character varying,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    assignee_id integer,
    weakness_detector_source character varying(255),
    source_identifier character varying(255),
    asset_identifier character varying(255),
    overall_remediation_plan text,
    original_detection_date timestamp without time zone,
    milestone_changes json,
    status_date timestamp without time zone,
    vendor_dependency character varying(255),
    last_vendor_checkin_date timestamp without time zone,
    product_name character varying(255),
    original_risk_rating character varying(50),
    adjusted_risk_rating character varying(50),
    risk_adjustment text,
    false_positive boolean DEFAULT false,
    operational_requirement text,
    deviation_rationale text,
    supporting_documents json,
    comments text,
    auto_approve boolean DEFAULT false,
    related_risk_id integer
);


--
-- Name: poam_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.poam_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: poam_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.poam_items_id_seq OWNED BY public.poam_items.id;


--
-- Name: policy_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policy_assignments (
    id integer NOT NULL,
    policy_id integer NOT NULL,
    employee_id integer NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    attested_at timestamp without time zone,
    assigned_at timestamp without time zone DEFAULT now(),
    viewed_at timestamp without time zone
);


--
-- Name: policy_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.policy_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: policy_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.policy_assignments_id_seq OWNED BY public.policy_assignments.id;


--
-- Name: policy_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policy_exceptions (
    id integer NOT NULL,
    policy_id integer,
    employee_id integer NOT NULL,
    reason text NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    expiration_date timestamp without time zone,
    approved_by integer,
    approved_at timestamp without time zone,
    rejection_reason text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    requirement_id integer,
    policy_type character varying(20) DEFAULT 'policy'::character varying
);


--
-- Name: policy_exceptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.policy_exceptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: policy_exceptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.policy_exceptions_id_seq OWNED BY public.policy_exceptions.id;


--
-- Name: policy_review_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policy_review_results (
    id integer NOT NULL,
    policy_review_id integer NOT NULL,
    overall_score integer,
    gaps json,
    compliance json,
    recommendations json,
    improved_policy_content text,
    ai_provider character varying(100),
    ai_model character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: policy_review_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.policy_review_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: policy_review_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.policy_review_results_id_seq OWNED BY public.policy_review_results.id;


--
-- Name: policy_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policy_reviews (
    id integer NOT NULL,
    client_id integer NOT NULL,
    policy_review_id character varying(50) NOT NULL,
    policy_name character varying(500) NOT NULL,
    policy_content text NOT NULL,
    selected_requirements json,
    status public.policy_review_status DEFAULT 'analyzing'::public.policy_review_status,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: policy_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.policy_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: policy_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.policy_reviews_id_seq OWNED BY public.policy_reviews.id;


--
-- Name: policy_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policy_templates (
    id integer NOT NULL,
    template_id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    content text,
    sections json,
    created_at timestamp without time zone DEFAULT now(),
    frameworks json,
    owner_id integer,
    is_public boolean DEFAULT false,
    client_id integer,
    updated_at timestamp without time zone DEFAULT now(),
    tailoring_questions jsonb
);


--
-- Name: policy_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.policy_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: policy_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.policy_templates_id_seq OWNED BY public.policy_templates.id;


--
-- Name: policy_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policy_versions (
    id integer NOT NULL,
    client_policy_id integer NOT NULL,
    version character varying(50) NOT NULL,
    content text,
    status character varying(50),
    description text,
    published_by integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: policy_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.policy_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: policy_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.policy_versions_id_seq OWNED BY public.policy_versions.id;


--
-- Name: power_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.power_id (
    id integer
);


--
-- Name: privacy_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.privacy_assessments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    type character varying(50) NOT NULL,
    responses json,
    status character varying(20) DEFAULT 'not_started'::character varying,
    score integer DEFAULT 0,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: privacy_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.privacy_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: privacy_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.privacy_assessments_id_seq OWNED BY public.privacy_assessments.id;


--
-- Name: process_data_flows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.process_data_flows (
    id integer NOT NULL,
    process_id integer NOT NULL,
    asset_id integer,
    data_elements text,
    interaction_type character varying(50),
    legal_basis character varying(100),
    purpose text,
    data_subject_type character varying(100),
    recipients text,
    is_cross_border boolean DEFAULT false,
    transfer_mechanism character varying(100),
    retention_period character varying(100),
    disposal_method character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: process_data_flows_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.process_data_flows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: process_data_flows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.process_data_flows_id_seq OWNED BY public.process_data_flows.id;


--
-- Name: process_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.process_dependencies (
    id integer NOT NULL,
    process_id integer NOT NULL,
    dependency_type character varying(50) NOT NULL,
    dependency_name character varying(255) NOT NULL,
    dependency_id integer,
    criticality character varying(50) DEFAULT 'medium'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: process_dependencies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.process_dependencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: process_dependencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.process_dependencies_id_seq OWNED BY public.process_dependencies.id;


--
-- Name: processing_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processing_activities (
    id integer NOT NULL,
    client_id integer NOT NULL,
    activity_name text NOT NULL,
    activity_id text NOT NULL,
    description text,
    role character varying(50) NOT NULL,
    controller_name text,
    controller_contact text,
    dpo_name text,
    dpo_contact text,
    representative_name text,
    representative_contact text,
    purposes json DEFAULT '[]'::json NOT NULL,
    legal_basis character varying(100) NOT NULL,
    data_categories json DEFAULT '[]'::json NOT NULL,
    data_subject_categories json DEFAULT '[]'::json NOT NULL,
    special_categories json DEFAULT '[]'::json,
    recipients json DEFAULT '[]'::json NOT NULL,
    recipient_categories json DEFAULT '[]'::json,
    has_international_transfers boolean DEFAULT false,
    transfer_countries json DEFAULT '[]'::json,
    transfer_safeguards text,
    transfer_details text,
    retention_period text,
    retention_criteria text,
    deletion_procedure text,
    technical_measures json DEFAULT '[]'::json,
    organizational_measures json DEFAULT '[]'::json,
    security_description text,
    status character varying(50) DEFAULT 'draft'::character varying,
    last_review_date timestamp without time zone,
    next_review_date timestamp without time zone,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: processing_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processing_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processing_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processing_activities_id_seq OWNED BY public.processing_activities.id;


--
-- Name: processing_activity_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processing_activity_assets (
    id integer NOT NULL,
    processing_activity_id integer NOT NULL,
    asset_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: processing_activity_assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processing_activity_assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processing_activity_assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processing_activity_assets_id_seq OWNED BY public.processing_activity_assets.id;


--
-- Name: processing_activity_vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processing_activity_vendors (
    id integer NOT NULL,
    processing_activity_id integer NOT NULL,
    vendor_id integer NOT NULL,
    role character varying(50),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: processing_activity_vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processing_activity_vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processing_activity_vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processing_activity_vendors_id_seq OWNED BY public.processing_activity_vendors.id;


--
-- Name: program_guide_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_guide_assignments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    guide_type character varying(50) NOT NULL,
    step_id character varying(50) NOT NULL,
    user_id integer NOT NULL,
    target_date timestamp without time zone,
    assigned_by integer,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: program_guide_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.program_guide_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: program_guide_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.program_guide_assignments_id_seq OWNED BY public.program_guide_assignments.id;


--
-- Name: project_compliance_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_compliance_mappings (
    id integer NOT NULL,
    project_id integer,
    framework character varying(100) NOT NULL,
    requirement_id character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    evidence_id integer,
    notes text,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    dev_project_id integer
);


--
-- Name: project_compliance_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_compliance_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_compliance_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_compliance_mappings_id_seq OWNED BY public.project_compliance_mappings.id;


--
-- Name: project_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_tasks (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(500) NOT NULL,
    description text,
    status public.kanban_status DEFAULT 'todo'::public.kanban_status,
    priority character varying(50) DEFAULT 'medium'::character varying,
    due_date timestamp without time zone,
    assignee_id integer,
    "position" integer DEFAULT 0,
    tags json,
    source_type character varying(50),
    source_id integer,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: project_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_tasks_id_seq OWNED BY public.project_tasks.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'planning'::character varying,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    owner character varying(255),
    project_type character varying(50) DEFAULT 'it'::character varying,
    security_criticality character varying(50) DEFAULT 'medium'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: questionnaire_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaire_questions (
    id integer NOT NULL,
    questionnaire_id integer NOT NULL,
    question text NOT NULL,
    answer text,
    confidence integer,
    sources json DEFAULT '[]'::json,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    question_id text,
    comment text,
    tags json DEFAULT '[]'::json,
    access character varying(50) DEFAULT 'internal'::character varying,
    assignee_id integer,
    category text,
    priority text,
    control_id text,
    control_framework text,
    remediation_deadline timestamp without time zone,
    answered_by integer,
    approved_by integer,
    approved_at timestamp without time zone,
    version integer DEFAULT 1,
    focus_area text,
    sub_focus_area text,
    extra_fields jsonb DEFAULT '{}'::jsonb
);


--
-- Name: questionnaire_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questionnaire_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questionnaire_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questionnaire_questions_id_seq OWNED BY public.questionnaire_questions.id;


--
-- Name: questionnaires; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaires (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name text NOT NULL,
    sender_name text,
    product_name text,
    status character varying(50) DEFAULT 'open'::character varying,
    progress integer DEFAULT 0,
    due_date timestamp without time zone,
    owner_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    vendor_name text,
    vendor_email text,
    vendor_token text,
    vendor_link_expires_at timestamp without time zone,
    category text,
    priority text,
    control_id text,
    control_framework text,
    remediation_deadline timestamp without time zone,
    answered_by integer,
    approved_by integer,
    approved_at timestamp without time zone,
    version integer DEFAULT 1,
    direction character varying(20) DEFAULT 'inbound'::character varying
);


--
-- Name: questionnaires_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questionnaires_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questionnaires_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questionnaires_id_seq OWNED BY public.questionnaires.id;


--
-- Name: readiness_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.readiness_assessments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'in_progress'::character varying,
    current_step integer DEFAULT 1,
    scope_details json,
    stakeholders json,
    existing_policies json,
    business_context json,
    maturity_expectations json,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    standard_id character varying(50) DEFAULT 'ISO27001'::character varying NOT NULL,
    scoping_report text,
    questionnaire_data jsonb
);


--
-- Name: readiness_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.readiness_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: readiness_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.readiness_assessments_id_seq OWNED BY public.readiness_assessments.id;


--
-- Name: recovery_objectives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recovery_objectives (
    id integer NOT NULL,
    bia_id integer NOT NULL,
    rto character varying(50),
    rpo character varying(50),
    mtpd character varying(50),
    dependencies text,
    resources text,
    created_at timestamp without time zone DEFAULT now(),
    activity character varying(255) NOT NULL,
    criticality character varying(50)
);


--
-- Name: recovery_objectives_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recovery_objectives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recovery_objectives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recovery_objectives_id_seq OWNED BY public.recovery_objectives.id;


--
-- Name: regulation_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulation_mappings (
    id integer NOT NULL,
    client_id integer NOT NULL,
    regulation_id character varying(50) NOT NULL,
    article_id character varying(50) NOT NULL,
    mapped_type character varying(50) NOT NULL,
    mapped_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: regulation_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.regulation_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: regulation_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.regulation_mappings_id_seq OWNED BY public.regulation_mappings.id;


--
-- Name: remediation_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.remediation_plans (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying,
    start_date timestamp without time zone DEFAULT now(),
    target_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: remediation_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.remediation_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: remediation_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.remediation_plans_id_seq OWNED BY public.remediation_plans.id;


--
-- Name: remediation_playbooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.remediation_playbooks (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    gap_pattern character varying(255) NOT NULL,
    category character varying(100),
    framework character varying(100),
    severity character varying(20) DEFAULT 'medium'::character varying,
    estimated_effort character varying(50),
    steps json DEFAULT '[]'::json,
    owner_template text,
    policy_language text,
    itsm_template json,
    priority integer DEFAULT 50,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: remediation_playbooks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.remediation_playbooks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: remediation_playbooks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.remediation_playbooks_id_seq OWNED BY public.remediation_playbooks.id;


--
-- Name: remediation_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.remediation_tasks (
    id integer NOT NULL,
    client_id integer NOT NULL,
    client_control_id integer,
    title character varying(500) NOT NULL,
    description text,
    priority character varying(50) DEFAULT 'medium'::character varying,
    status character varying(50) DEFAULT 'open'::character varying,
    due_date timestamp without time zone,
    assignee_id integer,
    issue_tracker_connection_id integer,
    external_issue_id character varying(255),
    external_issue_url character varying(1024),
    last_synced_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: remediation_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.remediation_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: remediation_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.remediation_tasks_id_seq OWNED BY public.remediation_tasks.id;


--
-- Name: report_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_logs (
    id integer NOT NULL,
    client_id integer NOT NULL,
    user_id integer,
    report_type public.report_type NOT NULL,
    format character varying(20) NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    metadata json
);


--
-- Name: report_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_logs_id_seq OWNED BY public.report_logs.id;


--
-- Name: risk_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_assessments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    assessment_id character varying(50) NOT NULL,
    risk_id integer,
    assessment_date timestamp without time zone,
    assessor character varying(255),
    method character varying(100),
    threat_description text,
    vulnerability_description text,
    affected_assets json,
    likelihood character varying(50),
    impact character varying(50),
    inherent_risk character varying(50),
    existing_controls text,
    control_effectiveness character varying(50),
    residual_risk character varying(50),
    risk_owner character varying(255),
    treatment_option character varying(50),
    recommended_actions text,
    priority character varying(50),
    target_residual_risk character varying(50),
    review_due_date timestamp without time zone,
    status public.risk_assessment_status DEFAULT 'draft'::public.risk_assessment_status,
    notes text,
    next_review_date timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    control_ids json,
    title character varying(255),
    threat_id integer,
    vulnerability_id integer,
    gap_response_id integer,
    affected_process_ids json,
    inherent_score integer,
    residual_score integer,
    context_snapshot json,
    project_id integer,
    category character varying(100) DEFAULT 'General'::character varying,
    owasp_category character varying(100),
    privacy_impact boolean DEFAULT false,
    csf_function character varying(50),
    ai_rmf_category character varying(50),
    fisma_system_id integer
);


--
-- Name: risk_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.risk_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: risk_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.risk_assessments_id_seq OWNED BY public.risk_assessments.id;


--
-- Name: risk_policy_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_policy_mappings (
    id integer NOT NULL,
    client_id integer NOT NULL,
    risk_assessment_id integer NOT NULL,
    client_policy_id integer NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: risk_policy_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.risk_policy_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: risk_policy_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.risk_policy_mappings_id_seq OWNED BY public.risk_policy_mappings.id;


--
-- Name: risk_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_reports (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) DEFAULT 'Risk Management Report'::character varying,
    executive_summary text,
    introduction text,
    scope text,
    methodology text,
    key_findings text,
    recommendations text,
    conclusion text,
    assumptions text,
    "references" text,
    status character varying(50) DEFAULT 'draft'::character varying,
    version integer DEFAULT 1,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: risk_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.risk_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: risk_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.risk_reports_id_seq OWNED BY public.risk_reports.id;


--
-- Name: risk_scenario_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_scenario_links (
    id integer NOT NULL,
    risk_id integer NOT NULL,
    scenario_id integer NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: risk_scenario_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.risk_scenario_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: risk_scenario_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.risk_scenario_links_id_seq OWNED BY public.risk_scenario_links.id;


--
-- Name: risk_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_scenarios (
    id integer NOT NULL,
    client_id integer NOT NULL,
    assessment_type character varying(50) DEFAULT 'asset'::character varying NOT NULL,
    asset_id integer,
    process_id character varying(100),
    vendor_id integer,
    title character varying(500) NOT NULL,
    description text,
    threat_category character varying(100),
    vulnerability character varying(255),
    likelihood integer DEFAULT 1,
    impact integer DEFAULT 1,
    inherent_risk_score integer,
    status character varying(50) DEFAULT 'identified'::character varying,
    owner character varying(255),
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    threat_id integer,
    vulnerability_id integer,
    gap_response_id integer,
    dev_project_id integer,
    threat_model_id integer,
    inherent_score integer,
    inherent_risk character varying(50),
    residual_likelihood integer,
    residual_impact integer,
    residual_score integer,
    residual_risk character varying(50),
    project_id integer,
    category character varying(100) DEFAULT 'General'::character varying,
    owasp_category character varying(100),
    privacy_impact boolean DEFAULT false,
    csf_function character varying(50),
    custom_mitigation_plan text
);


--
-- Name: risk_scenarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.risk_scenarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: risk_scenarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.risk_scenarios_id_seq OWNED BY public.risk_scenarios.id;


--
-- Name: risk_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_settings (
    id integer NOT NULL,
    client_id integer NOT NULL,
    scope text,
    context text,
    risk_appetite text,
    methodology character varying(255) DEFAULT 'ISO 27005'::character varying,
    impact_criteria json,
    likelihood_criteria json,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    risk_tolerance json
);


--
-- Name: risk_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.risk_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: risk_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.risk_settings_id_seq OWNED BY public.risk_settings.id;


--
-- Name: risk_treatments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_treatments (
    id integer NOT NULL,
    risk_scenario_id integer,
    treatment_type character varying(50) DEFAULT 'mitigate'::character varying NOT NULL,
    justification text,
    control_id integer,
    status character varying(50) DEFAULT 'planned'::character varying,
    due_date timestamp without time zone,
    owner character varying(255),
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    client_id integer,
    risk_assessment_id integer,
    strategy text,
    implementation_date timestamp without time zone,
    priority character varying(50),
    estimated_cost character varying(100)
);


--
-- Name: risk_treatments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.risk_treatments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: risk_treatments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.risk_treatments_id_seq OWNED BY public.risk_treatments.id;


--
-- Name: roadmap_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_items (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    control_id character varying(100),
    gap_response_id integer,
    title character varying(500) NOT NULL,
    description text,
    phase integer DEFAULT 1,
    "order" integer DEFAULT 0,
    status character varying(50) DEFAULT 'pending'::character varying,
    owner_role character varying(255),
    assignee_id integer,
    estimated_duration integer,
    actual_start_date timestamp without time zone,
    actual_end_date timestamp without time zone,
    dependencies json,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: roadmap_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_items_id_seq OWNED BY public.roadmap_items.id;


--
-- Name: roadmap_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_milestones (
    id integer NOT NULL,
    roadmap_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    target_date timestamp without time zone NOT NULL,
    actual_date timestamp without time zone,
    status character varying(50) DEFAULT 'pending'::character varying,
    dependencies json,
    progress_percentage integer DEFAULT 0,
    completed_items_count integer DEFAULT 0,
    total_items_count integer DEFAULT 0,
    is_gate boolean DEFAULT false,
    priority character varying(50) DEFAULT 'medium'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: roadmap_milestones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_milestones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_milestones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_milestones_id_seq OWNED BY public.roadmap_milestones.id;


--
-- Name: roadmap_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_reports (
    id integer NOT NULL,
    roadmap_id integer,
    client_id integer NOT NULL,
    title character varying(500) NOT NULL,
    version character varying(50) DEFAULT 'draft'::character varying,
    included_sections jsonb,
    data_sources jsonb,
    branding jsonb,
    file_path text,
    file_size integer,
    generated_at timestamp without time zone DEFAULT now(),
    generated_by integer,
    updated_at timestamp without time zone DEFAULT now(),
    content text
);


--
-- Name: roadmap_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_reports_id_seq OWNED BY public.roadmap_reports.id;


--
-- Name: roadmaps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmaps (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    vision text,
    objectives json,
    framework character varying(100),
    status public.roadmap_status DEFAULT 'draft'::public.roadmap_status,
    start_date timestamp without time zone,
    target_date timestamp without time zone,
    actual_start_date timestamp without time zone,
    actual_end_date timestamp without time zone,
    kpi_targets json,
    created_by_id integer NOT NULL,
    approved_by_id integer,
    approved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: roadmaps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmaps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmaps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmaps_id_seq OWNED BY public.roadmaps.id;


--
-- Name: samm_maturity_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.samm_maturity_assessments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    practice_id character varying(50) NOT NULL,
    maturity_level integer DEFAULT 0 NOT NULL,
    target_level integer DEFAULT 1 NOT NULL,
    evidence_links jsonb DEFAULT '[]'::jsonb,
    notes text,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: samm_maturity_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.samm_maturity_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: samm_maturity_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.samm_maturity_assessments_id_seq OWNED BY public.samm_maturity_assessments.id;


--
-- Name: samm_practices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.samm_practices (
    id integer NOT NULL,
    practice_id character varying(10) NOT NULL,
    practice_name character varying(100) NOT NULL,
    description text,
    business_function character varying(50) NOT NULL,
    stream_a_name character varying(100),
    stream_a_description text,
    stream_b_name character varying(100),
    stream_b_description text,
    official_link character varying(500),
    "order" integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: samm_practices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.samm_practices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: samm_practices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.samm_practices_id_seq OWNED BY public.samm_practices.id;


--
-- Name: samm_stream_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.samm_stream_assessments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    practice_id character varying(10) NOT NULL,
    stream_id character varying(1) NOT NULL,
    maturity_level integer DEFAULT 0 NOT NULL,
    target_level integer DEFAULT 1 NOT NULL,
    assessment_answers jsonb DEFAULT '{}'::jsonb,
    quality_criteria jsonb DEFAULT '{}'::jsonb,
    assessment_date timestamp without time zone,
    assessed_by integer,
    evidence jsonb DEFAULT '[]'::jsonb,
    notes text,
    improvement_notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    level_notes jsonb DEFAULT '{}'::jsonb,
    criteria_notes jsonb DEFAULT '{}'::jsonb
);


--
-- Name: samm_stream_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.samm_stream_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: samm_stream_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.samm_stream_assessments_id_seq OWNED BY public.samm_stream_assessments.id;


--
-- Name: samm_stream_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.samm_stream_questions (
    id integer NOT NULL,
    practice_id character varying(10) NOT NULL,
    practice_name character varying(100) NOT NULL,
    stream_id character varying(1) NOT NULL,
    stream_name character varying(100) NOT NULL,
    stream_description text,
    level integer NOT NULL,
    level_name character varying(50),
    question text NOT NULL,
    quality_criteria jsonb DEFAULT '[]'::jsonb,
    activities jsonb DEFAULT '[]'::jsonb,
    benefits text,
    maturity_indicators jsonb DEFAULT '[]'::jsonb,
    suggested_evidence jsonb DEFAULT '[]'::jsonb,
    business_function character varying(50) NOT NULL,
    official_link character varying(500),
    is_active boolean DEFAULT true,
    version character varying(20) DEFAULT '2.0'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: samm_stream_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.samm_stream_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: samm_stream_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.samm_stream_questions_id_seq OWNED BY public.samm_stream_questions.id;


--
-- Name: strategic_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strategic_reports (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text,
    roadmap_id integer,
    implementation_plan_id integer,
    status character varying(50) DEFAULT 'draft'::character varying,
    version character varying(50) DEFAULT '1.0'::character varying,
    created_by_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: strategic_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.strategic_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: strategic_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.strategic_reports_id_seq OWNED BY public.strategic_reports.id;


--
-- Name: supply_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supply_id (
    id integer
);


--
-- Name: sys2_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys2_id (
    id integer
);


--
-- Name: sys3_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys3_id (
    id integer
);


--
-- Name: system_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_feedback (
    id integer NOT NULL,
    user_id integer,
    client_id integer,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    url character varying(1024),
    status character varying(50) DEFAULT 'new'::character varying,
    admin_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_feedback_id_seq OWNED BY public.system_feedback.id;


--
-- Name: task_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_assignments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    task_type character varying(50) NOT NULL,
    task_id integer NOT NULL,
    user_id integer NOT NULL,
    raci_role public.raci_role NOT NULL,
    assigned_at timestamp without time zone DEFAULT now(),
    assigned_by integer
);


--
-- Name: task_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_assignments_id_seq OWNED BY public.task_assignments.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    assignee_id integer,
    due_date timestamp without time zone,
    status character varying(50) DEFAULT 'pending'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    related_entity_type character varying(50),
    related_entity_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer
);


--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: tech_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tech_suggestions (
    id integer NOT NULL,
    client_id integer NOT NULL,
    control_id integer NOT NULL,
    suggestion_text text NOT NULL,
    tech_id character varying(100),
    vendor character varying(100),
    sources json,
    created_by character varying(50) DEFAULT 'ai'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    status character varying(50) DEFAULT 'proposed'::character varying,
    feedback text,
    applied_at timestamp without time zone
);


--
-- Name: tech_suggestions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tech_suggestions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tech_suggestions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tech_suggestions_id_seq OWNED BY public.tech_suggestions.id;


--
-- Name: threat_intel_sync_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.threat_intel_sync_log (
    id integer NOT NULL,
    source character varying(50) NOT NULL,
    sync_type character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'completed'::character varying,
    records_processed integer DEFAULT 0,
    error_message text,
    started_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone
);


--
-- Name: threat_intel_sync_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.threat_intel_sync_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: threat_intel_sync_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.threat_intel_sync_log_id_seq OWNED BY public.threat_intel_sync_log.id;


--
-- Name: threat_model_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.threat_model_components (
    id integer NOT NULL,
    threat_model_id integer NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    x integer DEFAULT 0,
    y integer DEFAULT 0
);


--
-- Name: threat_model_components_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.threat_model_components_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: threat_model_components_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.threat_model_components_id_seq OWNED BY public.threat_model_components.id;


--
-- Name: threat_model_data_flows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.threat_model_data_flows (
    id integer NOT NULL,
    threat_model_id integer NOT NULL,
    source_component_id integer NOT NULL,
    target_component_id integer NOT NULL,
    protocol character varying(50) DEFAULT 'HTTPS'::character varying,
    is_encrypted boolean DEFAULT true,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: threat_model_data_flows_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.threat_model_data_flows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: threat_model_data_flows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.threat_model_data_flows_id_seq OWNED BY public.threat_model_data_flows.id;


--
-- Name: threat_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.threat_models (
    id integer NOT NULL,
    client_id integer NOT NULL,
    dev_project_id integer,
    name character varying(255) NOT NULL,
    methodology character varying(50) DEFAULT 'STRIDE'::character varying,
    status character varying(50) DEFAULT 'draft'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    project_id integer
);


--
-- Name: threat_models_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.threat_models_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: threat_models_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.threat_models_id_seq OWNED BY public.threat_models.id;


--
-- Name: threats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.threats (
    id integer NOT NULL,
    client_id integer NOT NULL,
    threat_id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(100),
    source character varying(100),
    intent character varying(50),
    likelihood character varying(50),
    potential_impact text,
    affected_assets json,
    related_vulnerabilities json,
    associated_risks json,
    scenario text,
    detection_method text,
    status public.threat_status DEFAULT 'active'::public.threat_status,
    owner character varying(255),
    last_review_date timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: threats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.threats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: threats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.threats_id_seq OWNED BY public.threats.id;


--
-- Name: training_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_assignments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    employee_id integer NOT NULL,
    module_id integer NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    score integer,
    feedback text,
    assigned_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: training_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.training_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: training_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.training_assignments_id_seq OWNED BY public.training_assignments.id;


--
-- Name: training_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_modules (
    id integer NOT NULL,
    client_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    type character varying(20) NOT NULL,
    video_url text,
    content text,
    duration_minutes integer DEFAULT 0,
    active boolean DEFAULT true,
    "order" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    thumbnail_url text
);


--
-- Name: training_modules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.training_modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: training_modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.training_modules_id_seq OWNED BY public.training_modules.id;


--
-- Name: transfer_impact_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transfer_impact_assessments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    transfer_id integer NOT NULL,
    risk_level character varying(50),
    status character varying(50) DEFAULT 'draft'::character varying,
    questionnaire_data json,
    version integer DEFAULT 1,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: transfer_impact_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transfer_impact_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transfer_impact_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transfer_impact_assessments_id_seq OWNED BY public.transfer_impact_assessments.id;


--
-- Name: treatment_controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_controls (
    id integer NOT NULL,
    treatment_id integer NOT NULL,
    control_id integer NOT NULL,
    effectiveness character varying(50),
    implementation_notes text,
    created_at timestamp without time zone DEFAULT now(),
    client_id integer DEFAULT 0 NOT NULL,
    notes text
);


--
-- Name: treatment_controls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.treatment_controls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: treatment_controls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.treatment_controls_id_seq OWNED BY public.treatment_controls.id;


--
-- Name: trust_center_visitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trust_center_visitors (
    id integer NOT NULL,
    client_id integer NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255),
    company character varying(255),
    last_seen_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: trust_center_visitors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trust_center_visitors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trust_center_visitors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trust_center_visitors_id_seq OWNED BY public.trust_center_visitors.id;


--
-- Name: trust_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trust_documents (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    file_url text NOT NULL,
    is_locked boolean DEFAULT false,
    category character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: trust_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trust_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trust_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trust_documents_id_seq OWNED BY public.trust_documents.id;


--
-- Name: user_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_clients (
    id integer NOT NULL,
    user_id integer NOT NULL,
    client_id integer NOT NULL,
    role public.role DEFAULT 'viewer'::public.role NOT NULL,
    joined_at timestamp without time zone DEFAULT now(),
    access_expires_at timestamp without time zone
);


--
-- Name: user_clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_clients_id_seq OWNED BY public.user_clients.id;


--
-- Name: user_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_invitations (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'viewer'::character varying NOT NULL,
    client_id integer,
    invited_by integer NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_invitations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_invitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_invitations_id_seq OWNED BY public.user_invitations.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    open_id character varying(255) NOT NULL,
    name character varying(255),
    email character varying(255),
    login_method character varying(255),
    last_signed_in timestamp without time zone DEFAULT now(),
    role character varying(50) DEFAULT 'user'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    max_clients integer DEFAULT 2,
    stripe_customer_id character varying(255),
    subscription_status character varying(50),
    plan_tier character varying(50) DEFAULT 'free'::character varying,
    has_seen_tour boolean DEFAULT false,
    access_expires_at timestamp without time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vendor_assessment_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_assessment_requests (
    id integer NOT NULL,
    client_id integer NOT NULL,
    vendor_id integer NOT NULL,
    template_id integer NOT NULL,
    token character varying(64) NOT NULL,
    recipient_email character varying(255),
    status character varying(50) DEFAULT 'draft'::character varying,
    responses json,
    score integer,
    sent_at timestamp without time zone,
    expires_at timestamp without time zone,
    viewed_at timestamp without time zone,
    submitted_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: vendor_assessment_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_assessment_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_assessment_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_assessment_requests_id_seq OWNED BY public.vendor_assessment_requests.id;


--
-- Name: vendor_assessment_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_assessment_templates (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    content json,
    created_by integer,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: vendor_assessment_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_assessment_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_assessment_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_assessment_templates_id_seq OWNED BY public.vendor_assessment_templates.id;


--
-- Name: vendor_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_assessments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    vendor_id integer NOT NULL,
    type character varying(100),
    status character varying(50) DEFAULT 'Planned'::character varying,
    score integer,
    findings text,
    document_url character varying(1024),
    due_date timestamp without time zone,
    completed_date timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    inherent_impact character varying(50),
    inherent_likelihood character varying(50),
    inherent_risk_level character varying(50),
    residual_impact character varying(50),
    residual_likelihood character varying(50),
    residual_risk_level character varying(50),
    review_status character varying(50) DEFAULT 'pending'::character varying
);


--
-- Name: vendor_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_assessments_id_seq OWNED BY public.vendor_assessments.id;


--
-- Name: vendor_authorizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_authorizations (
    id integer NOT NULL,
    client_id integer NOT NULL,
    vendor_id integer NOT NULL,
    initiated_by integer,
    status character varying(50) DEFAULT 'Pending'::character varying,
    notification_date timestamp without time zone,
    objection_deadline timestamp without time zone,
    approval_date timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: vendor_authorizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_authorizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_authorizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_authorizations_id_seq OWNED BY public.vendor_authorizations.id;


--
-- Name: vendor_breaches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_breaches (
    id integer NOT NULL,
    vendor_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    breach_date timestamp without time zone,
    severity character varying(50),
    source character varying(255),
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: vendor_breaches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_breaches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_breaches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_breaches_id_seq OWNED BY public.vendor_breaches.id;


--
-- Name: vendor_change_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_change_logs (
    id integer NOT NULL,
    client_id integer NOT NULL,
    vendor_id integer NOT NULL,
    change_type character varying(50) NOT NULL,
    description text,
    old_value json,
    new_value json,
    detected_at timestamp without time zone DEFAULT now()
);


--
-- Name: vendor_change_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_change_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_change_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_change_logs_id_seq OWNED BY public.vendor_change_logs.id;


--
-- Name: vendor_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_contacts (
    id integer NOT NULL,
    client_id integer NOT NULL,
    vendor_id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    role character varying(100),
    is_primary boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: vendor_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_contacts_id_seq OWNED BY public.vendor_contacts.id;


--
-- Name: vendor_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_contracts (
    id integer NOT NULL,
    client_id integer NOT NULL,
    vendor_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    auto_renew boolean DEFAULT false,
    value character varying(50),
    status character varying(50) DEFAULT 'Active'::character varying,
    document_url text,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    notice_period character varying(50),
    payment_terms character varying(50),
    sla_details text,
    dpa_status character varying(50) DEFAULT 'Not Signed'::character varying,
    owner character varying(100)
);


--
-- Name: vendor_contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_contracts_id_seq OWNED BY public.vendor_contracts.id;


--
-- Name: vendor_cve_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_cve_matches (
    id integer NOT NULL,
    vendor_id integer NOT NULL,
    cve_id character varying(50) NOT NULL,
    match_score integer,
    match_reason text,
    status character varying(50) DEFAULT 'Active'::character varying,
    discovered_at timestamp without time zone DEFAULT now(),
    description text,
    cvss_score character varying(10),
    scan_id integer
);


--
-- Name: vendor_cve_matches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_cve_matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_cve_matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_cve_matches_id_seq OWNED BY public.vendor_cve_matches.id;


--
-- Name: vendor_data_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_data_requests (
    id integer NOT NULL,
    client_id integer NOT NULL,
    vendor_id integer NOT NULL,
    token character varying(64) NOT NULL,
    recipient_email character varying(255),
    message text,
    status character varying(50) DEFAULT 'sent'::character varying,
    items json,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: vendor_data_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_data_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_data_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_data_requests_id_seq OWNED BY public.vendor_data_requests.id;


--
-- Name: vendor_dpas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_dpas (
    id integer NOT NULL,
    client_id integer NOT NULL,
    vendor_id integer NOT NULL,
    template_id integer,
    name character varying(255) NOT NULL,
    content text NOT NULL,
    status character varying(50) DEFAULT 'Draft'::character varying,
    version integer DEFAULT 1,
    signed_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: vendor_dpas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_dpas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_dpas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_dpas_id_seq OWNED BY public.vendor_dpas.id;


--
-- Name: vendor_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_requests (
    id integer NOT NULL,
    client_id integer NOT NULL,
    requester_id integer,
    name character varying(255) NOT NULL,
    website character varying(255),
    category character varying(100),
    description text,
    status character varying(50) DEFAULT 'pending'::character varying,
    business_owner character varying(100),
    rejection_reason text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: vendor_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_requests_id_seq OWNED BY public.vendor_requests.id;


--
-- Name: vendor_scans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_scans (
    id integer NOT NULL,
    client_id integer NOT NULL,
    vendor_id integer NOT NULL,
    scan_date timestamp without time zone DEFAULT now(),
    status character varying(50) DEFAULT 'Completed'::character varying,
    risk_score integer,
    vulnerability_count integer DEFAULT 0,
    breach_count integer DEFAULT 0,
    raw_result text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: vendor_scans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_scans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_scans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_scans_id_seq OWNED BY public.vendor_scans.id;


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    website character varying(512),
    criticality character varying(50) DEFAULT 'Low'::character varying,
    data_access character varying(50) DEFAULT 'Internal'::character varying,
    misc_data json,
    status character varying(50) DEFAULT 'Active'::character varying,
    owner_id integer,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    security_owner_id integer,
    category character varying(100) DEFAULT 'Unassigned'::character varying,
    source character varying(100),
    discovery_date timestamp without time zone,
    review_status character varying(50) DEFAULT 'needs_review'::character varying,
    trust_center_url character varying(512),
    trust_center_data json,
    trust_score integer,
    service_description text,
    additional_notes text,
    additional_documents json,
    is_subprocessor boolean DEFAULT false,
    data_location character varying(255),
    transfer_mechanism character varying(255),
    recursive_subprocessors json,
    dpa_analysis json,
    last_trust_center_change timestamp without time zone,
    uses_ai boolean DEFAULT false,
    is_ai_service boolean DEFAULT false,
    ai_data_usage text,
    nis2_category character varying(100),
    is_essential_service boolean DEFAULT false,
    supply_chain_impact integer DEFAULT 1,
    last_supply_chain_review timestamp without time zone
);


--
-- Name: vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendors_id_seq OWNED BY public.vendors.id;


--
-- Name: vulnerabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vulnerabilities (
    id integer NOT NULL,
    client_id integer NOT NULL,
    vulnerability_id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    cve_id character varying(50),
    cvss_score integer,
    severity character varying(50),
    affected_assets json,
    discovery_date timestamp without time zone,
    source character varying(100),
    exploitability character varying(255),
    impact character varying(255),
    status public.vulnerability_status DEFAULT 'open'::public.vulnerability_status,
    owner character varying(255),
    remediation_plan text,
    due_date timestamp without time zone,
    last_review_date timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: vulnerabilities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vulnerabilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vulnerabilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vulnerabilities_id_seq OWNED BY public.vulnerabilities.id;


--
-- Name: waiting_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waiting_list (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    first_name character varying(255),
    last_name character varying(255),
    company character varying(255),
    role character varying(255),
    certification character varying(255),
    org_size character varying(100),
    industry character varying(255),
    status character varying(50) DEFAULT 'pending'::character varying,
    source character varying(50) DEFAULT 'landing_page'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: waiting_list_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.waiting_list_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: waiting_list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.waiting_list_id_seq OWNED BY public.waiting_list.id;


--
-- Name: work_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_items (
    id integer NOT NULL,
    client_id integer NOT NULL,
    type public.work_item_type NOT NULL,
    status public.work_item_status DEFAULT 'pending'::public.work_item_status,
    priority public.work_item_priority DEFAULT 'medium'::public.work_item_priority,
    title character varying(500) NOT NULL,
    description text,
    entity_type public.governance_entity_type,
    entity_id integer,
    assigned_to_user_id integer,
    assigned_to_employee_id integer,
    assigned_role character varying(50),
    due_date timestamp without time zone,
    completed_at timestamp without time zone,
    is_escalated boolean DEFAULT false,
    escalated_at timestamp without time zone,
    escalation_rule_id integer,
    metadata json,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: work_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_items_id_seq OWNED BY public.work_items.id;


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea
)
PARTITION BY RANGE (inserted_at);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    selected_columns text[],
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: addon_run_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_run_logs ALTER COLUMN id SET DEFAULT nextval('public.addon_run_logs_id_seq'::regclass);


--
-- Name: addon_subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.addon_subscriptions_id_seq'::regclass);


--
-- Name: adequacy_decisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adequacy_decisions ALTER COLUMN id SET DEFAULT nextval('public.adequacy_decisions_id_seq'::regclass);


--
-- Name: advisor_conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_conversations ALTER COLUMN id SET DEFAULT nextval('public.advisor_conversations_id_seq'::regclass);


--
-- Name: advisor_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_messages ALTER COLUMN id SET DEFAULT nextval('public.advisor_messages_id_seq'::regclass);


--
-- Name: ai_impact_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_impact_assessments ALTER COLUMN id SET DEFAULT nextval('public.ai_impact_assessments_id_seq'::regclass);


--
-- Name: ai_system_controls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_system_controls ALTER COLUMN id SET DEFAULT nextval('public.ai_system_controls_id_seq'::regclass);


--
-- Name: ai_systems id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_systems ALTER COLUMN id SET DEFAULT nextval('public.ai_systems_id_seq'::regclass);


--
-- Name: ai_usage_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_metrics ALTER COLUMN id SET DEFAULT nextval('public.ai_usage_metrics_id_seq'::regclass);


--
-- Name: approval_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests ALTER COLUMN id SET DEFAULT nextval('public.approval_requests_id_seq'::regclass);


--
-- Name: approval_signatures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_signatures ALTER COLUMN id SET DEFAULT nextval('public.approval_signatures_id_seq'::regclass);


--
-- Name: asset_cve_matches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_cve_matches ALTER COLUMN id SET DEFAULT nextval('public.asset_cve_matches_id_seq'::regclass);


--
-- Name: assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets ALTER COLUMN id SET DEFAULT nextval('public.assets_id_seq'::regclass);


--
-- Name: asvs_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asvs_assessments ALTER COLUMN id SET DEFAULT nextval('public.asvs_assessments_id_seq'::regclass);


--
-- Name: asvs_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asvs_categories ALTER COLUMN id SET DEFAULT nextval('public.asvs_categories_id_seq'::regclass);


--
-- Name: asvs_requirements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asvs_requirements ALTER COLUMN id SET DEFAULT nextval('public.asvs_requirements_id_seq'::regclass);


--
-- Name: audit_findings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_findings ALTER COLUMN id SET DEFAULT nextval('public.audit_findings_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: audit_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_notes ALTER COLUMN id SET DEFAULT nextval('public.audit_notes_id_seq'::regclass);


--
-- Name: bc_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_approvals ALTER COLUMN id SET DEFAULT nextval('public.bc_approvals_id_seq'::regclass);


--
-- Name: bc_committee_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_committee_members ALTER COLUMN id SET DEFAULT nextval('public.bc_committee_members_id_seq'::regclass);


--
-- Name: bc_plan_appendices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_appendices ALTER COLUMN id SET DEFAULT nextval('public.bc_plan_appendices_id_seq'::regclass);


--
-- Name: bc_plan_bias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_bias ALTER COLUMN id SET DEFAULT nextval('public.bc_plan_bias_id_seq'::regclass);


--
-- Name: bc_plan_communication_channels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_communication_channels ALTER COLUMN id SET DEFAULT nextval('public.bc_plan_communication_channels_id_seq'::regclass);


--
-- Name: bc_plan_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_contacts ALTER COLUMN id SET DEFAULT nextval('public.bc_plan_contacts_id_seq'::regclass);


--
-- Name: bc_plan_logistics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_logistics ALTER COLUMN id SET DEFAULT nextval('public.bc_plan_logistics_id_seq'::regclass);


--
-- Name: bc_plan_scenarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_scenarios ALTER COLUMN id SET DEFAULT nextval('public.bc_plan_scenarios_id_seq'::regclass);


--
-- Name: bc_plan_sections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_sections ALTER COLUMN id SET DEFAULT nextval('public.bc_plan_sections_id_seq'::regclass);


--
-- Name: bc_plan_strategies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_strategies ALTER COLUMN id SET DEFAULT nextval('public.bc_plan_strategies_id_seq'::regclass);


--
-- Name: bc_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plans ALTER COLUMN id SET DEFAULT nextval('public.bc_plans_id_seq'::regclass);


--
-- Name: bc_programs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_programs ALTER COLUMN id SET DEFAULT nextval('public.bc_programs_id_seq'::regclass);


--
-- Name: bc_strategies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_strategies ALTER COLUMN id SET DEFAULT nextval('public.bc_strategies_id_seq'::regclass);


--
-- Name: bc_training_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_training_records ALTER COLUMN id SET DEFAULT nextval('public.bc_training_records_id_seq'::regclass);


--
-- Name: bcp_projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bcp_projects ALTER COLUMN id SET DEFAULT nextval('public.bcp_projects_id_seq'::regclass);


--
-- Name: bcp_stakeholders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bcp_stakeholders ALTER COLUMN id SET DEFAULT nextval('public.bcp_stakeholders_id_seq'::regclass);


--
-- Name: bia_questionnaires id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bia_questionnaires ALTER COLUMN id SET DEFAULT nextval('public.bia_questionnaires_id_seq'::regclass);


--
-- Name: bia_seasonal_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bia_seasonal_events ALTER COLUMN id SET DEFAULT nextval('public.bia_seasonal_events_id_seq'::regclass);


--
-- Name: bia_vital_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bia_vital_records ALTER COLUMN id SET DEFAULT nextval('public.bia_vital_records_id_seq'::regclass);


--
-- Name: business_impact_analyses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_impact_analyses ALTER COLUMN id SET DEFAULT nextval('public.business_impact_analyses_id_seq'::regclass);


--
-- Name: business_processes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_processes ALTER COLUMN id SET DEFAULT nextval('public.business_processes_id_seq'::regclass);


--
-- Name: certification_audits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certification_audits ALTER COLUMN id SET DEFAULT nextval('public.certification_audits_id_seq'::regclass);


--
-- Name: checklist_states id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_states ALTER COLUMN id SET DEFAULT nextval('public.checklist_states_id_seq'::regclass);


--
-- Name: cisa_kev_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cisa_kev_cache ALTER COLUMN id SET DEFAULT nextval('public.cisa_kev_cache_id_seq'::regclass);


--
-- Name: client_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_contacts ALTER COLUMN id SET DEFAULT nextval('public.client_contacts_id_seq'::regclass);


--
-- Name: client_controls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_controls ALTER COLUMN id SET DEFAULT nextval('public.client_controls_id_seq'::regclass);


--
-- Name: client_framework_controls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_framework_controls ALTER COLUMN id SET DEFAULT nextval('public.client_framework_controls_id_seq'::regclass);


--
-- Name: client_framework_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_framework_mappings ALTER COLUMN id SET DEFAULT nextval('public.client_framework_mappings_id_seq'::regclass);


--
-- Name: client_frameworks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_frameworks ALTER COLUMN id SET DEFAULT nextval('public.client_frameworks_id_seq'::regclass);


--
-- Name: client_integrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_integrations ALTER COLUMN id SET DEFAULT nextval('public.client_integrations_id_seq'::regclass);


--
-- Name: client_policies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_policies ALTER COLUMN id SET DEFAULT nextval('public.client_policies_id_seq'::regclass);


--
-- Name: client_readiness_responses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_readiness_responses ALTER COLUMN id SET DEFAULT nextval('public.client_readiness_responses_id_seq'::regclass);


--
-- Name: client_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_settings ALTER COLUMN id SET DEFAULT nextval('public.client_settings_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: cloud_assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cloud_assets ALTER COLUMN id SET DEFAULT nextval('public.cloud_assets_id_seq'::regclass);


--
-- Name: cloud_connections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cloud_connections ALTER COLUMN id SET DEFAULT nextval('public.cloud_connections_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: common_controls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.common_controls ALTER COLUMN id SET DEFAULT nextval('public.common_controls_id_seq'::regclass);


--
-- Name: communication_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_templates ALTER COLUMN id SET DEFAULT nextval('public.communication_templates_id_seq'::regclass);


--
-- Name: compliance_certificates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_certificates ALTER COLUMN id SET DEFAULT nextval('public.compliance_certificates_id_seq'::regclass);


--
-- Name: compliance_frameworks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_frameworks ALTER COLUMN id SET DEFAULT nextval('public.compliance_frameworks_id_seq'::regclass);


--
-- Name: compliance_requirements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_requirements ALTER COLUMN id SET DEFAULT nextval('public.compliance_requirements_id_seq'::regclass);


--
-- Name: compliance_snapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_snapshots ALTER COLUMN id SET DEFAULT nextval('public.compliance_snapshots_id_seq'::regclass);


--
-- Name: consent_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_templates ALTER COLUMN id SET DEFAULT nextval('public.consent_templates_id_seq'::regclass);


--
-- Name: consents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consents ALTER COLUMN id SET DEFAULT nextval('public.consents_id_seq'::regclass);


--
-- Name: control_baselines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_baselines ALTER COLUMN id SET DEFAULT nextval('public.control_baselines_id_seq'::regclass);


--
-- Name: control_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_history ALTER COLUMN id SET DEFAULT nextval('public.control_history_id_seq'::regclass);


--
-- Name: control_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_mappings ALTER COLUMN id SET DEFAULT nextval('public.control_mappings_id_seq'::regclass);


--
-- Name: control_policy_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_policy_mappings ALTER COLUMN id SET DEFAULT nextval('public.control_policy_mappings_id_seq'::regclass);


--
-- Name: control_tech_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_tech_mappings ALTER COLUMN id SET DEFAULT nextval('public.control_tech_mappings_id_seq'::regclass);


--
-- Name: controls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls ALTER COLUMN id SET DEFAULT nextval('public.controls_id_seq'::regclass);


--
-- Name: crm_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activities ALTER COLUMN id SET DEFAULT nextval('public.crm_activities_id_seq'::regclass);


--
-- Name: crm_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_contacts ALTER COLUMN id SET DEFAULT nextval('public.crm_contacts_id_seq'::regclass);


--
-- Name: crm_deal_stages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_deal_stages ALTER COLUMN id SET DEFAULT nextval('public.crm_deal_stages_id_seq'::regclass);


--
-- Name: crm_deals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_deals ALTER COLUMN id SET DEFAULT nextval('public.crm_deals_id_seq'::regclass);


--
-- Name: crm_engagements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_engagements ALTER COLUMN id SET DEFAULT nextval('public.crm_engagements_id_seq'::regclass);


--
-- Name: crm_leads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_leads ALTER COLUMN id SET DEFAULT nextval('public.crm_leads_id_seq'::regclass);


--
-- Name: data_breaches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_breaches ALTER COLUMN id SET DEFAULT nextval('public.data_breaches_id_seq'::regclass);


--
-- Name: data_flow_connections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_flow_connections ALTER COLUMN id SET DEFAULT nextval('public.data_flow_connections_id_seq'::regclass);


--
-- Name: data_flow_nodes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_flow_nodes ALTER COLUMN id SET DEFAULT nextval('public.data_flow_nodes_id_seq'::regclass);


--
-- Name: data_flow_visualizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_flow_visualizations ALTER COLUMN id SET DEFAULT nextval('public.data_flow_visualizations_id_seq'::regclass);


--
-- Name: data_protection_impact_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_protection_impact_assessments ALTER COLUMN id SET DEFAULT nextval('public.data_protection_impact_assessments_id_seq'::regclass);


--
-- Name: dev_projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_projects ALTER COLUMN id SET DEFAULT nextval('public.dev_projects_id_seq'::regclass);


--
-- Name: disruptive_scenarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disruptive_scenarios ALTER COLUMN id SET DEFAULT nextval('public.disruptive_scenarios_id_seq'::regclass);


--
-- Name: dpa_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dpa_templates ALTER COLUMN id SET DEFAULT nextval('public.dpa_templates_id_seq'::regclass);


--
-- Name: dpia_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dpia_templates ALTER COLUMN id SET DEFAULT nextval('public.dpia_templates_id_seq'::regclass);


--
-- Name: dsar_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsar_requests ALTER COLUMN id SET DEFAULT nextval('public.dsar_requests_id_seq'::regclass);


--
-- Name: dsar_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsar_templates ALTER COLUMN id SET DEFAULT nextval('public.dsar_templates_id_seq'::regclass);


--
-- Name: email_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages ALTER COLUMN id SET DEFAULT nextval('public.email_messages_id_seq'::regclass);


--
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);


--
-- Name: email_triggers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_triggers ALTER COLUMN id SET DEFAULT nextval('public.email_triggers_id_seq'::regclass);


--
-- Name: embeddings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.embeddings ALTER COLUMN id SET DEFAULT nextval('public.embeddings_id_seq'::regclass);


--
-- Name: employee_acknowledgments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_acknowledgments ALTER COLUMN id SET DEFAULT nextval('public.employee_acknowledgments_id_seq'::regclass);


--
-- Name: employee_asset_receipts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_asset_receipts ALTER COLUMN id SET DEFAULT nextval('public.employee_asset_receipts_id_seq'::regclass);


--
-- Name: employee_security_setup id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_security_setup ALTER COLUMN id SET DEFAULT nextval('public.employee_security_setup_id_seq'::regclass);


--
-- Name: employee_task_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_task_assignments ALTER COLUMN id SET DEFAULT nextval('public.employee_task_assignments_id_seq'::regclass);


--
-- Name: employee_training_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_training_records ALTER COLUMN id SET DEFAULT nextval('public.employee_training_records_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: escalation_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation_rules ALTER COLUMN id SET DEFAULT nextval('public.escalation_rules_id_seq'::regclass);


--
-- Name: essential_eight_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.essential_eight_assessments ALTER COLUMN id SET DEFAULT nextval('public.essential_eight_assessments_id_seq'::regclass);


--
-- Name: evidence id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence ALTER COLUMN id SET DEFAULT nextval('public.evidence_id_seq'::regclass);


--
-- Name: evidence_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_comments ALTER COLUMN id SET DEFAULT nextval('public.evidence_comments_id_seq'::regclass);


--
-- Name: evidence_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_files ALTER COLUMN id SET DEFAULT nextval('public.evidence_files_id_seq'::regclass);


--
-- Name: evidence_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_requests ALTER COLUMN id SET DEFAULT nextval('public.evidence_requests_id_seq'::regclass);


--
-- Name: evidence_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_templates ALTER COLUMN id SET DEFAULT nextval('public.evidence_templates_id_seq'::regclass);


--
-- Name: federal_contracts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_contracts ALTER COLUMN id SET DEFAULT nextval('public.federal_contracts_id_seq'::regclass);


--
-- Name: federal_disa_stig_checklists id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_disa_stig_checklists ALTER COLUMN id SET DEFAULT nextval('public.federal_disa_stig_checklists_id_seq'::regclass);


--
-- Name: federal_disa_stig_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_disa_stig_items ALTER COLUMN id SET DEFAULT nextval('public.federal_disa_stig_items_id_seq'::regclass);


--
-- Name: federal_fedramp_packages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_fedramp_packages ALTER COLUMN id SET DEFAULT nextval('public.federal_fedramp_packages_id_seq'::regclass);


--
-- Name: federal_fips_140_module_assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_fips_140_module_assets ALTER COLUMN id SET DEFAULT nextval('public.federal_fips_140_module_assets_id_seq'::regclass);


--
-- Name: federal_fips_140_modules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_fips_140_modules ALTER COLUMN id SET DEFAULT nextval('public.federal_fips_140_modules_id_seq'::regclass);


--
-- Name: federal_fips_categorizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_fips_categorizations ALTER COLUMN id SET DEFAULT nextval('public.federal_fips_categorizations_id_seq'::regclass);


--
-- Name: federal_fisma_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_fisma_reports ALTER COLUMN id SET DEFAULT nextval('public.federal_fisma_reports_id_seq'::regclass);


--
-- Name: federal_fisma_systems id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_fisma_systems ALTER COLUMN id SET DEFAULT nextval('public.federal_fisma_systems_id_seq'::regclass);


--
-- Name: federal_inheritances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_inheritances ALTER COLUMN id SET DEFAULT nextval('public.federal_inheritances_id_seq'::regclass);


--
-- Name: federal_nist_800_53_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_nist_800_53_assessments ALTER COLUMN id SET DEFAULT nextval('public.federal_nist_800_53_assessments_id_seq'::regclass);


--
-- Name: federal_poams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_poams ALTER COLUMN id SET DEFAULT nextval('public.federal_poams_id_seq'::regclass);


--
-- Name: federal_rmf_workflows id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_rmf_workflows ALTER COLUMN id SET DEFAULT nextval('public.federal_rmf_workflows_id_seq'::regclass);


--
-- Name: federal_sar_findings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_sar_findings ALTER COLUMN id SET DEFAULT nextval('public.federal_sar_findings_id_seq'::regclass);


--
-- Name: federal_sars id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_sars ALTER COLUMN id SET DEFAULT nextval('public.federal_sars_id_seq'::regclass);


--
-- Name: federal_sprs_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_sprs_assessments ALTER COLUMN id SET DEFAULT nextval('public.federal_sprs_assessments_id_seq'::regclass);


--
-- Name: federal_ssp_controls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_ssp_controls ALTER COLUMN id SET DEFAULT nextval('public.federal_ssp_controls_id_seq'::regclass);


--
-- Name: federal_ssp_sections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_ssp_sections ALTER COLUMN id SET DEFAULT nextval('public.federal_ssp_sections_id_seq'::regclass);


--
-- Name: federal_ssps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_ssps ALTER COLUMN id SET DEFAULT nextval('public.federal_ssps_id_seq'::regclass);


--
-- Name: financial_impacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_impacts ALTER COLUMN id SET DEFAULT nextval('public.financial_impacts_id_seq'::regclass);


--
-- Name: fips_199_information_types_ref id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fips_199_information_types_ref ALTER COLUMN id SET DEFAULT nextval('public.fips_199_information_types_ref_id_seq'::regclass);


--
-- Name: fips_categorizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fips_categorizations ALTER COLUMN id SET DEFAULT nextval('public.fips_categorizations_id_seq'::regclass);


--
-- Name: framework_knowledge_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_knowledge_mappings ALTER COLUMN id SET DEFAULT nextval('public.framework_knowledge_mappings_id_seq'::regclass);


--
-- Name: framework_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_mappings ALTER COLUMN id SET DEFAULT nextval('public.framework_mappings_id_seq'::regclass);


--
-- Name: framework_mappings_deprecated id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_mappings_deprecated ALTER COLUMN id SET DEFAULT nextval('public.framework_mappings_deprecated_id_seq'::regclass);


--
-- Name: framework_requirements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_requirements ALTER COLUMN id SET DEFAULT nextval('public.framework_requirements_id_seq'::regclass);


--
-- Name: gap_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gap_assessments ALTER COLUMN id SET DEFAULT nextval('public.gap_assessments_id_seq'::regclass);


--
-- Name: gap_questionnaire_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gap_questionnaire_requests ALTER COLUMN id SET DEFAULT nextval('public.gap_questionnaire_requests_id_seq'::regclass);


--
-- Name: gap_responses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gap_responses ALTER COLUMN id SET DEFAULT nextval('public.gap_responses_id_seq'::regclass);


--
-- Name: global_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_contacts ALTER COLUMN id SET DEFAULT nextval('public.global_contacts_id_seq'::regclass);


--
-- Name: global_crm_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_crm_activities ALTER COLUMN id SET DEFAULT nextval('public.global_crm_activities_id_seq'::regclass);


--
-- Name: global_crm_contact_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_crm_contact_tags ALTER COLUMN id SET DEFAULT nextval('public.global_crm_contact_tags_id_seq'::regclass);


--
-- Name: global_crm_deals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_crm_deals ALTER COLUMN id SET DEFAULT nextval('public.global_crm_deals_id_seq'::regclass);


--
-- Name: global_crm_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_crm_notes ALTER COLUMN id SET DEFAULT nextval('public.global_crm_notes_id_seq'::regclass);


--
-- Name: global_crm_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_crm_tags ALTER COLUMN id SET DEFAULT nextval('public.global_crm_tags_id_seq'::regclass);


--
-- Name: global_vendors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_vendors ALTER COLUMN id SET DEFAULT nextval('public.global_vendors_id_seq'::regclass);


--
-- Name: governance_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.governance_events ALTER COLUMN id SET DEFAULT nextval('public.governance_events_id_seq'::regclass);


--
-- Name: gumroad_webhook_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gumroad_webhook_events ALTER COLUMN id SET DEFAULT nextval('public.gumroad_webhook_events_id_seq'::regclass);


--
-- Name: impact_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_assessments ALTER COLUMN id SET DEFAULT nextval('public.impact_assessments_id_seq'::regclass);


--
-- Name: implementation_phases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.implementation_phases ALTER COLUMN id SET DEFAULT nextval('public.implementation_phases_id_seq'::regclass);


--
-- Name: implementation_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.implementation_plans ALTER COLUMN id SET DEFAULT nextval('public.implementation_plans_id_seq'::regclass);


--
-- Name: implementation_progress id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.implementation_progress ALTER COLUMN id SET DEFAULT nextval('public.implementation_progress_id_seq'::regclass);


--
-- Name: implementation_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.implementation_tasks ALTER COLUMN id SET DEFAULT nextval('public.implementation_tasks_id_seq'::regclass);


--
-- Name: implementation_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.implementation_templates ALTER COLUMN id SET DEFAULT nextval('public.implementation_templates_id_seq'::regclass);


--
-- Name: incidents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents ALTER COLUMN id SET DEFAULT nextval('public.incidents_id_seq'::regclass);


--
-- Name: intake_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_items ALTER COLUMN id SET DEFAULT nextval('public.intake_items_id_seq'::regclass);


--
-- Name: integration_definitions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_definitions ALTER COLUMN id SET DEFAULT nextval('public.integration_definitions_id_seq'::regclass);


--
-- Name: integrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations ALTER COLUMN id SET DEFAULT nextval('public.integrations_id_seq'::regclass);


--
-- Name: international_transfers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.international_transfers ALTER COLUMN id SET DEFAULT nextval('public.international_transfers_id_seq'::regclass);


--
-- Name: issue_tracker_connections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_tracker_connections ALTER COLUMN id SET DEFAULT nextval('public.issue_tracker_connections_id_seq'::regclass);


--
-- Name: knowledge_articles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_articles ALTER COLUMN id SET DEFAULT nextval('public.knowledge_articles_id_seq'::regclass);


--
-- Name: knowledge_base_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base_entries ALTER COLUMN id SET DEFAULT nextval('public.knowledge_base_entries_id_seq'::regclass);


--
-- Name: kris id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kris ALTER COLUMN id SET DEFAULT nextval('public.kris_id_seq'::regclass);


--
-- Name: license_activations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_activations ALTER COLUMN id SET DEFAULT nextval('public.license_activations_id_seq'::regclass);


--
-- Name: license_configurations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_configurations ALTER COLUMN id SET DEFAULT nextval('public.license_configurations_id_seq'::regclass);


--
-- Name: license_feature_usage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_feature_usage ALTER COLUMN id SET DEFAULT nextval('public.license_feature_usage_id_seq'::regclass);


--
-- Name: license_status_enum id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_status_enum ALTER COLUMN id SET DEFAULT nextval('public.license_status_enum_id_seq'::regclass);


--
-- Name: license_type_enum id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_type_enum ALTER COLUMN id SET DEFAULT nextval('public.license_type_enum_id_seq'::regclass);


--
-- Name: license_validation_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_validation_logs ALTER COLUMN id SET DEFAULT nextval('public.license_validation_logs_id_seq'::regclass);


--
-- Name: llm_providers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llm_providers ALTER COLUMN id SET DEFAULT nextval('public.llm_providers_id_seq'::regclass);


--
-- Name: llm_router_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llm_router_rules ALTER COLUMN id SET DEFAULT nextval('public.llm_router_rules_id_seq'::regclass);


--
-- Name: magic_link_redemptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_link_redemptions ALTER COLUMN id SET DEFAULT nextval('public.magic_link_redemptions_id_seq'::regclass);


--
-- Name: magic_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_links ALTER COLUMN id SET DEFAULT nextval('public.magic_links_id_seq'::regclass);


--
-- Name: maturity_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_assessments ALTER COLUMN id SET DEFAULT nextval('public.maturity_assessments_id_seq'::regclass);


--
-- Name: maturity_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_categories ALTER COLUMN id SET DEFAULT nextval('public.maturity_categories_id_seq'::regclass);


--
-- Name: maturity_client_frameworks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_client_frameworks ALTER COLUMN id SET DEFAULT nextval('public.maturity_client_frameworks_id_seq'::regclass);


--
-- Name: maturity_requirements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_requirements ALTER COLUMN id SET DEFAULT nextval('public.maturity_requirements_id_seq'::regclass);


--
-- Name: maturity_simulations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_simulations ALTER COLUMN id SET DEFAULT nextval('public.maturity_simulations_id_seq'::regclass);


--
-- Name: nda_signatures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nda_signatures ALTER COLUMN id SET DEFAULT nextval('public.nda_signatures_id_seq'::regclass);


--
-- Name: nis2_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nis2_mappings ALTER COLUMN id SET DEFAULT nextval('public.nis2_mappings_id_seq'::regclass);


--
-- Name: nist_80030_impact_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nist_80030_impact_assessments ALTER COLUMN id SET DEFAULT nextval('public.nist_80030_impact_assessments_id_seq'::regclass);


--
-- Name: nist_80030_threat_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nist_80030_threat_events ALTER COLUMN id SET DEFAULT nextval('public.nist_80030_threat_events_id_seq'::regclass);


--
-- Name: nist_80030_threat_sources id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nist_80030_threat_sources ALTER COLUMN id SET DEFAULT nextval('public.nist_80030_threat_sources_id_seq'::regclass);


--
-- Name: nist_tiers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nist_tiers ALTER COLUMN id SET DEFAULT nextval('public.nist_tiers_id_seq'::regclass);


--
-- Name: notification_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_log ALTER COLUMN id SET DEFAULT nextval('public.notification_log_id_seq'::regclass);


--
-- Name: notification_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings ALTER COLUMN id SET DEFAULT nextval('public.notification_settings_id_seq'::regclass);


--
-- Name: nvd_cve_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nvd_cve_cache ALTER COLUMN id SET DEFAULT nextval('public.nvd_cve_cache_id_seq'::regclass);


--
-- Name: org_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_roles ALTER COLUMN id SET DEFAULT nextval('public.org_roles_id_seq'::regclass);


--
-- Name: plan_change_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_change_log ALTER COLUMN id SET DEFAULT nextval('public.plan_change_log_id_seq'::regclass);


--
-- Name: plan_exercises id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_exercises ALTER COLUMN id SET DEFAULT nextval('public.plan_exercises_id_seq'::regclass);


--
-- Name: plan_versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_versions ALTER COLUMN id SET DEFAULT nextval('public.plan_versions_id_seq'::regclass);


--
-- Name: poam_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poam_items ALTER COLUMN id SET DEFAULT nextval('public.poam_items_id_seq'::regclass);


--
-- Name: policy_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_assignments ALTER COLUMN id SET DEFAULT nextval('public.policy_assignments_id_seq'::regclass);


--
-- Name: policy_exceptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_exceptions ALTER COLUMN id SET DEFAULT nextval('public.policy_exceptions_id_seq'::regclass);


--
-- Name: policy_review_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_review_results ALTER COLUMN id SET DEFAULT nextval('public.policy_review_results_id_seq'::regclass);


--
-- Name: policy_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_reviews ALTER COLUMN id SET DEFAULT nextval('public.policy_reviews_id_seq'::regclass);


--
-- Name: policy_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_templates ALTER COLUMN id SET DEFAULT nextval('public.policy_templates_id_seq'::regclass);


--
-- Name: policy_versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_versions ALTER COLUMN id SET DEFAULT nextval('public.policy_versions_id_seq'::regclass);


--
-- Name: privacy_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_assessments ALTER COLUMN id SET DEFAULT nextval('public.privacy_assessments_id_seq'::regclass);


--
-- Name: process_data_flows id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_data_flows ALTER COLUMN id SET DEFAULT nextval('public.process_data_flows_id_seq'::regclass);


--
-- Name: process_dependencies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_dependencies ALTER COLUMN id SET DEFAULT nextval('public.process_dependencies_id_seq'::regclass);


--
-- Name: processing_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_activities ALTER COLUMN id SET DEFAULT nextval('public.processing_activities_id_seq'::regclass);


--
-- Name: processing_activity_assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_activity_assets ALTER COLUMN id SET DEFAULT nextval('public.processing_activity_assets_id_seq'::regclass);


--
-- Name: processing_activity_vendors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_activity_vendors ALTER COLUMN id SET DEFAULT nextval('public.processing_activity_vendors_id_seq'::regclass);


--
-- Name: program_guide_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_guide_assignments ALTER COLUMN id SET DEFAULT nextval('public.program_guide_assignments_id_seq'::regclass);


--
-- Name: project_compliance_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_compliance_mappings ALTER COLUMN id SET DEFAULT nextval('public.project_compliance_mappings_id_seq'::regclass);


--
-- Name: project_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tasks ALTER COLUMN id SET DEFAULT nextval('public.project_tasks_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: questionnaire_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_questions ALTER COLUMN id SET DEFAULT nextval('public.questionnaire_questions_id_seq'::regclass);


--
-- Name: questionnaires id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaires ALTER COLUMN id SET DEFAULT nextval('public.questionnaires_id_seq'::regclass);


--
-- Name: readiness_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readiness_assessments ALTER COLUMN id SET DEFAULT nextval('public.readiness_assessments_id_seq'::regclass);


--
-- Name: recovery_objectives id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recovery_objectives ALTER COLUMN id SET DEFAULT nextval('public.recovery_objectives_id_seq'::regclass);


--
-- Name: regulation_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_mappings ALTER COLUMN id SET DEFAULT nextval('public.regulation_mappings_id_seq'::regclass);


--
-- Name: remediation_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remediation_plans ALTER COLUMN id SET DEFAULT nextval('public.remediation_plans_id_seq'::regclass);


--
-- Name: remediation_playbooks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remediation_playbooks ALTER COLUMN id SET DEFAULT nextval('public.remediation_playbooks_id_seq'::regclass);


--
-- Name: remediation_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remediation_tasks ALTER COLUMN id SET DEFAULT nextval('public.remediation_tasks_id_seq'::regclass);


--
-- Name: report_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_logs ALTER COLUMN id SET DEFAULT nextval('public.report_logs_id_seq'::regclass);


--
-- Name: risk_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessments ALTER COLUMN id SET DEFAULT nextval('public.risk_assessments_id_seq'::regclass);


--
-- Name: risk_policy_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_policy_mappings ALTER COLUMN id SET DEFAULT nextval('public.risk_policy_mappings_id_seq'::regclass);


--
-- Name: risk_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_reports ALTER COLUMN id SET DEFAULT nextval('public.risk_reports_id_seq'::regclass);


--
-- Name: risk_scenario_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_scenario_links ALTER COLUMN id SET DEFAULT nextval('public.risk_scenario_links_id_seq'::regclass);


--
-- Name: risk_scenarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_scenarios ALTER COLUMN id SET DEFAULT nextval('public.risk_scenarios_id_seq'::regclass);


--
-- Name: risk_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_settings ALTER COLUMN id SET DEFAULT nextval('public.risk_settings_id_seq'::regclass);


--
-- Name: risk_treatments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_treatments ALTER COLUMN id SET DEFAULT nextval('public.risk_treatments_id_seq'::regclass);


--
-- Name: roadmap_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_items ALTER COLUMN id SET DEFAULT nextval('public.roadmap_items_id_seq'::regclass);


--
-- Name: roadmap_milestones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_milestones ALTER COLUMN id SET DEFAULT nextval('public.roadmap_milestones_id_seq'::regclass);


--
-- Name: roadmap_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_reports ALTER COLUMN id SET DEFAULT nextval('public.roadmap_reports_id_seq'::regclass);


--
-- Name: roadmaps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmaps ALTER COLUMN id SET DEFAULT nextval('public.roadmaps_id_seq'::regclass);


--
-- Name: samm_maturity_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samm_maturity_assessments ALTER COLUMN id SET DEFAULT nextval('public.samm_maturity_assessments_id_seq'::regclass);


--
-- Name: samm_practices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samm_practices ALTER COLUMN id SET DEFAULT nextval('public.samm_practices_id_seq'::regclass);


--
-- Name: samm_stream_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samm_stream_assessments ALTER COLUMN id SET DEFAULT nextval('public.samm_stream_assessments_id_seq'::regclass);


--
-- Name: samm_stream_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samm_stream_questions ALTER COLUMN id SET DEFAULT nextval('public.samm_stream_questions_id_seq'::regclass);


--
-- Name: strategic_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_reports ALTER COLUMN id SET DEFAULT nextval('public.strategic_reports_id_seq'::regclass);


--
-- Name: system_feedback id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_feedback ALTER COLUMN id SET DEFAULT nextval('public.system_feedback_id_seq'::regclass);


--
-- Name: task_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments ALTER COLUMN id SET DEFAULT nextval('public.task_assignments_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: tech_suggestions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tech_suggestions ALTER COLUMN id SET DEFAULT nextval('public.tech_suggestions_id_seq'::regclass);


--
-- Name: threat_intel_sync_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threat_intel_sync_log ALTER COLUMN id SET DEFAULT nextval('public.threat_intel_sync_log_id_seq'::regclass);


--
-- Name: threat_model_components id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threat_model_components ALTER COLUMN id SET DEFAULT nextval('public.threat_model_components_id_seq'::regclass);


--
-- Name: threat_model_data_flows id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threat_model_data_flows ALTER COLUMN id SET DEFAULT nextval('public.threat_model_data_flows_id_seq'::regclass);


--
-- Name: threat_models id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threat_models ALTER COLUMN id SET DEFAULT nextval('public.threat_models_id_seq'::regclass);


--
-- Name: threats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threats ALTER COLUMN id SET DEFAULT nextval('public.threats_id_seq'::regclass);


--
-- Name: training_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_assignments ALTER COLUMN id SET DEFAULT nextval('public.training_assignments_id_seq'::regclass);


--
-- Name: training_modules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_modules ALTER COLUMN id SET DEFAULT nextval('public.training_modules_id_seq'::regclass);


--
-- Name: transfer_impact_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_impact_assessments ALTER COLUMN id SET DEFAULT nextval('public.transfer_impact_assessments_id_seq'::regclass);


--
-- Name: treatment_controls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_controls ALTER COLUMN id SET DEFAULT nextval('public.treatment_controls_id_seq'::regclass);


--
-- Name: trust_center_visitors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_center_visitors ALTER COLUMN id SET DEFAULT nextval('public.trust_center_visitors_id_seq'::regclass);


--
-- Name: trust_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_documents ALTER COLUMN id SET DEFAULT nextval('public.trust_documents_id_seq'::regclass);


--
-- Name: user_clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_clients ALTER COLUMN id SET DEFAULT nextval('public.user_clients_id_seq'::regclass);


--
-- Name: user_invitations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_invitations ALTER COLUMN id SET DEFAULT nextval('public.user_invitations_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vendor_assessment_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_assessment_requests ALTER COLUMN id SET DEFAULT nextval('public.vendor_assessment_requests_id_seq'::regclass);


--
-- Name: vendor_assessment_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_assessment_templates ALTER COLUMN id SET DEFAULT nextval('public.vendor_assessment_templates_id_seq'::regclass);


--
-- Name: vendor_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_assessments ALTER COLUMN id SET DEFAULT nextval('public.vendor_assessments_id_seq'::regclass);


--
-- Name: vendor_authorizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_authorizations ALTER COLUMN id SET DEFAULT nextval('public.vendor_authorizations_id_seq'::regclass);


--
-- Name: vendor_breaches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_breaches ALTER COLUMN id SET DEFAULT nextval('public.vendor_breaches_id_seq'::regclass);


--
-- Name: vendor_change_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_change_logs ALTER COLUMN id SET DEFAULT nextval('public.vendor_change_logs_id_seq'::regclass);


--
-- Name: vendor_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contacts ALTER COLUMN id SET DEFAULT nextval('public.vendor_contacts_id_seq'::regclass);


--
-- Name: vendor_contracts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contracts ALTER COLUMN id SET DEFAULT nextval('public.vendor_contracts_id_seq'::regclass);


--
-- Name: vendor_cve_matches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_cve_matches ALTER COLUMN id SET DEFAULT nextval('public.vendor_cve_matches_id_seq'::regclass);


--
-- Name: vendor_data_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_data_requests ALTER COLUMN id SET DEFAULT nextval('public.vendor_data_requests_id_seq'::regclass);


--
-- Name: vendor_dpas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_dpas ALTER COLUMN id SET DEFAULT nextval('public.vendor_dpas_id_seq'::regclass);


--
-- Name: vendor_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_requests ALTER COLUMN id SET DEFAULT nextval('public.vendor_requests_id_seq'::regclass);


--
-- Name: vendor_scans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_scans ALTER COLUMN id SET DEFAULT nextval('public.vendor_scans_id_seq'::regclass);


--
-- Name: vendors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors ALTER COLUMN id SET DEFAULT nextval('public.vendors_id_seq'::regclass);


--
-- Name: vulnerabilities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vulnerabilities ALTER COLUMN id SET DEFAULT nextval('public.vulnerabilities_id_seq'::regclass);


--
-- Name: waiting_list id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waiting_list ALTER COLUMN id SET DEFAULT nextval('public.waiting_list_id_seq'::regclass);


--
-- Name: work_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_items ALTER COLUMN id SET DEFAULT nextval('public.work_items_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: addon_run_logs addon_run_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_run_logs
    ADD CONSTRAINT addon_run_logs_pkey PRIMARY KEY (id);


--
-- Name: addon_subscriptions addon_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_subscriptions
    ADD CONSTRAINT addon_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: adequacy_decisions adequacy_decisions_country_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adequacy_decisions
    ADD CONSTRAINT adequacy_decisions_country_code_unique UNIQUE (country_code);


--
-- Name: adequacy_decisions adequacy_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adequacy_decisions
    ADD CONSTRAINT adequacy_decisions_pkey PRIMARY KEY (id);


--
-- Name: advisor_conversations advisor_conversations_conversation_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_conversations
    ADD CONSTRAINT advisor_conversations_conversation_id_unique UNIQUE (conversation_id);


--
-- Name: advisor_conversations advisor_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_conversations
    ADD CONSTRAINT advisor_conversations_pkey PRIMARY KEY (id);


--
-- Name: advisor_messages advisor_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_messages
    ADD CONSTRAINT advisor_messages_pkey PRIMARY KEY (id);


--
-- Name: ai_impact_assessments ai_impact_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_impact_assessments
    ADD CONSTRAINT ai_impact_assessments_pkey PRIMARY KEY (id);


--
-- Name: ai_system_controls ai_system_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_system_controls
    ADD CONSTRAINT ai_system_controls_pkey PRIMARY KEY (id);


--
-- Name: ai_systems ai_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_systems
    ADD CONSTRAINT ai_systems_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_metrics ai_usage_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_metrics
    ADD CONSTRAINT ai_usage_metrics_pkey PRIMARY KEY (id);


--
-- Name: approval_requests approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);


--
-- Name: approval_signatures approval_signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_signatures
    ADD CONSTRAINT approval_signatures_pkey PRIMARY KEY (id);


--
-- Name: asset_cve_matches asset_cve_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_cve_matches
    ADD CONSTRAINT asset_cve_matches_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: asvs_assessments asvs_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asvs_assessments
    ADD CONSTRAINT asvs_assessments_pkey PRIMARY KEY (id);


--
-- Name: asvs_categories asvs_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asvs_categories
    ADD CONSTRAINT asvs_categories_code_key UNIQUE (code);


--
-- Name: asvs_categories asvs_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asvs_categories
    ADD CONSTRAINT asvs_categories_pkey PRIMARY KEY (id);


--
-- Name: asvs_requirements asvs_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asvs_requirements
    ADD CONSTRAINT asvs_requirements_pkey PRIMARY KEY (id);


--
-- Name: asvs_requirements asvs_requirements_requirement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asvs_requirements
    ADD CONSTRAINT asvs_requirements_requirement_id_key UNIQUE (requirement_id);


--
-- Name: audit_findings audit_findings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_findings
    ADD CONSTRAINT audit_findings_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_notes audit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_notes
    ADD CONSTRAINT audit_notes_pkey PRIMARY KEY (id);


--
-- Name: bc_approvals bc_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_approvals
    ADD CONSTRAINT bc_approvals_pkey PRIMARY KEY (id);


--
-- Name: bc_committee_members bc_committee_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_committee_members
    ADD CONSTRAINT bc_committee_members_pkey PRIMARY KEY (id);


--
-- Name: bc_plan_appendices bc_plan_appendices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_appendices
    ADD CONSTRAINT bc_plan_appendices_pkey PRIMARY KEY (id);


--
-- Name: bc_plan_bias bc_plan_bias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_bias
    ADD CONSTRAINT bc_plan_bias_pkey PRIMARY KEY (id);


--
-- Name: bc_plan_communication_channels bc_plan_communication_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_communication_channels
    ADD CONSTRAINT bc_plan_communication_channels_pkey PRIMARY KEY (id);


--
-- Name: bc_plan_contacts bc_plan_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_contacts
    ADD CONSTRAINT bc_plan_contacts_pkey PRIMARY KEY (id);


--
-- Name: bc_plan_logistics bc_plan_logistics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_logistics
    ADD CONSTRAINT bc_plan_logistics_pkey PRIMARY KEY (id);


--
-- Name: bc_plan_scenarios bc_plan_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_scenarios
    ADD CONSTRAINT bc_plan_scenarios_pkey PRIMARY KEY (id);


--
-- Name: bc_plan_sections bc_plan_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_sections
    ADD CONSTRAINT bc_plan_sections_pkey PRIMARY KEY (id);


--
-- Name: bc_plan_strategies bc_plan_strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plan_strategies
    ADD CONSTRAINT bc_plan_strategies_pkey PRIMARY KEY (id);


--
-- Name: bc_plans bc_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_plans
    ADD CONSTRAINT bc_plans_pkey PRIMARY KEY (id);


--
-- Name: bc_programs bc_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_programs
    ADD CONSTRAINT bc_programs_pkey PRIMARY KEY (id);


--
-- Name: bc_strategies bc_strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_strategies
    ADD CONSTRAINT bc_strategies_pkey PRIMARY KEY (id);


--
-- Name: bc_training_records bc_training_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bc_training_records
    ADD CONSTRAINT bc_training_records_pkey PRIMARY KEY (id);


--
-- Name: bcp_projects bcp_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bcp_projects
    ADD CONSTRAINT bcp_projects_pkey PRIMARY KEY (id);


--
-- Name: bcp_stakeholders bcp_stakeholders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bcp_stakeholders
    ADD CONSTRAINT bcp_stakeholders_pkey PRIMARY KEY (id);


--
-- Name: bia_questionnaires bia_questionnaires_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bia_questionnaires
    ADD CONSTRAINT bia_questionnaires_pkey PRIMARY KEY (id);


--
-- Name: bia_seasonal_events bia_seasonal_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bia_seasonal_events
    ADD CONSTRAINT bia_seasonal_events_pkey PRIMARY KEY (id);


--
-- Name: bia_vital_records bia_vital_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bia_vital_records
    ADD CONSTRAINT bia_vital_records_pkey PRIMARY KEY (id);


--
-- Name: business_impact_analyses business_impact_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_impact_analyses
    ADD CONSTRAINT business_impact_analyses_pkey PRIMARY KEY (id);


--
-- Name: business_processes business_processes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_processes
    ADD CONSTRAINT business_processes_pkey PRIMARY KEY (id);


--
-- Name: certification_audits certification_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certification_audits
    ADD CONSTRAINT certification_audits_pkey PRIMARY KEY (id);


--
-- Name: checklist_states checklist_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_states
    ADD CONSTRAINT checklist_states_pkey PRIMARY KEY (id);


--
-- Name: cisa_kev_cache cisa_kev_cache_cve_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cisa_kev_cache
    ADD CONSTRAINT cisa_kev_cache_cve_id_unique UNIQUE (cve_id);


--
-- Name: cisa_kev_cache cisa_kev_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cisa_kev_cache
    ADD CONSTRAINT cisa_kev_cache_pkey PRIMARY KEY (id);


--
-- Name: client_contacts client_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_contacts
    ADD CONSTRAINT client_contacts_pkey PRIMARY KEY (id);


--
-- Name: client_controls client_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_controls
    ADD CONSTRAINT client_controls_pkey PRIMARY KEY (id);


--
-- Name: client_framework_controls client_framework_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_framework_controls
    ADD CONSTRAINT client_framework_controls_pkey PRIMARY KEY (id);


--
-- Name: client_framework_mappings client_framework_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_framework_mappings
    ADD CONSTRAINT client_framework_mappings_pkey PRIMARY KEY (id);


--
-- Name: client_frameworks client_frameworks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_frameworks
    ADD CONSTRAINT client_frameworks_pkey PRIMARY KEY (id);


--
-- Name: client_integrations client_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_integrations
    ADD CONSTRAINT client_integrations_pkey PRIMARY KEY (id);


--
-- Name: client_policies client_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_policies
    ADD CONSTRAINT client_policies_pkey PRIMARY KEY (id);


--
-- Name: client_readiness_responses client_readiness_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_readiness_responses
    ADD CONSTRAINT client_readiness_responses_pkey PRIMARY KEY (id);


--
-- Name: client_settings client_settings_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_settings
    ADD CONSTRAINT client_settings_client_id_key UNIQUE (client_id);


--
-- Name: client_settings client_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_settings
    ADD CONSTRAINT client_settings_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: cloud_assets cloud_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cloud_assets
    ADD CONSTRAINT cloud_assets_pkey PRIMARY KEY (id);


--
-- Name: cloud_connections cloud_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cloud_connections
    ADD CONSTRAINT cloud_connections_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: common_controls common_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.common_controls
    ADD CONSTRAINT common_controls_pkey PRIMARY KEY (id);


--
-- Name: communication_templates communication_templates_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_templates
    ADD CONSTRAINT communication_templates_key_unique UNIQUE (key);


--
-- Name: communication_templates communication_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_templates
    ADD CONSTRAINT communication_templates_pkey PRIMARY KEY (id);


--
-- Name: compliance_certificates compliance_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_certificates
    ADD CONSTRAINT compliance_certificates_pkey PRIMARY KEY (id);


--
-- Name: compliance_frameworks compliance_frameworks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_frameworks
    ADD CONSTRAINT compliance_frameworks_pkey PRIMARY KEY (id);


--
-- Name: compliance_requirements compliance_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_requirements
    ADD CONSTRAINT compliance_requirements_pkey PRIMARY KEY (id);


--
-- Name: compliance_snapshots compliance_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_snapshots
    ADD CONSTRAINT compliance_snapshots_pkey PRIMARY KEY (id);


--
-- Name: consent_templates consent_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_templates
    ADD CONSTRAINT consent_templates_pkey PRIMARY KEY (id);


--
-- Name: consents consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT consents_pkey PRIMARY KEY (id);


--
-- Name: control_baselines control_baselines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_baselines
    ADD CONSTRAINT control_baselines_pkey PRIMARY KEY (id);


--
-- Name: control_history control_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_history
    ADD CONSTRAINT control_history_pkey PRIMARY KEY (id);


--
-- Name: control_mappings control_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_mappings
    ADD CONSTRAINT control_mappings_pkey PRIMARY KEY (id);


--
-- Name: control_policy_mappings control_policy_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_policy_mappings
    ADD CONSTRAINT control_policy_mappings_pkey PRIMARY KEY (id);


--
-- Name: control_tech_mappings control_tech_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_tech_mappings
    ADD CONSTRAINT control_tech_mappings_pkey PRIMARY KEY (id);


--
-- Name: controls controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls
    ADD CONSTRAINT controls_pkey PRIMARY KEY (id);


--
-- Name: crm_activities crm_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_pkey PRIMARY KEY (id);


--
-- Name: crm_contacts crm_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_contacts
    ADD CONSTRAINT crm_contacts_pkey PRIMARY KEY (id);


--
-- Name: crm_deal_stages crm_deal_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_deal_stages
    ADD CONSTRAINT crm_deal_stages_pkey PRIMARY KEY (id);


--
-- Name: crm_deals crm_deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_deals
    ADD CONSTRAINT crm_deals_pkey PRIMARY KEY (id);


--
-- Name: crm_engagements crm_engagements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_engagements
    ADD CONSTRAINT crm_engagements_pkey PRIMARY KEY (id);


--
-- Name: crm_leads crm_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_pkey PRIMARY KEY (id);


--
-- Name: data_breaches data_breaches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_breaches
    ADD CONSTRAINT data_breaches_pkey PRIMARY KEY (id);


--
-- Name: data_flow_connections data_flow_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_flow_connections
    ADD CONSTRAINT data_flow_connections_pkey PRIMARY KEY (id);


--
-- Name: data_flow_nodes data_flow_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_flow_nodes
    ADD CONSTRAINT data_flow_nodes_pkey PRIMARY KEY (id);


--
-- Name: data_flow_visualizations data_flow_visualizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_flow_visualizations
    ADD CONSTRAINT data_flow_visualizations_pkey PRIMARY KEY (id);


--
-- Name: data_protection_impact_assessments data_protection_impact_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_protection_impact_assessments
    ADD CONSTRAINT data_protection_impact_assessments_pkey PRIMARY KEY (id);


--
-- Name: dev_projects dev_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_projects
    ADD CONSTRAINT dev_projects_pkey PRIMARY KEY (id);


--
-- Name: disruptive_scenarios disruptive_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disruptive_scenarios
    ADD CONSTRAINT disruptive_scenarios_pkey PRIMARY KEY (id);


--
-- Name: dpa_templates dpa_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dpa_templates
    ADD CONSTRAINT dpa_templates_pkey PRIMARY KEY (id);


--
-- Name: dpia_templates dpia_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dpia_templates
    ADD CONSTRAINT dpia_templates_pkey PRIMARY KEY (id);


--
-- Name: dsar_requests dsar_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsar_requests
    ADD CONSTRAINT dsar_requests_pkey PRIMARY KEY (id);


--
-- Name: dsar_templates dsar_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsar_templates
    ADD CONSTRAINT dsar_templates_pkey PRIMARY KEY (id);


--
-- Name: email_messages email_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_slug_unique UNIQUE (slug);


--
-- Name: email_triggers email_triggers_event_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_triggers
    ADD CONSTRAINT email_triggers_event_slug_key UNIQUE (event_slug);


--
-- Name: email_triggers email_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_triggers
    ADD CONSTRAINT email_triggers_pkey PRIMARY KEY (id);


--
-- Name: embeddings embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.embeddings
    ADD CONSTRAINT embeddings_pkey PRIMARY KEY (id);


--
-- Name: employee_acknowledgments employee_acknowledgments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_acknowledgments
    ADD CONSTRAINT employee_acknowledgments_pkey PRIMARY KEY (id);


--
-- Name: employee_asset_receipts employee_asset_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_asset_receipts
    ADD CONSTRAINT employee_asset_receipts_pkey PRIMARY KEY (id);


--
-- Name: employee_security_setup employee_security_setup_employee_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_security_setup
    ADD CONSTRAINT employee_security_setup_employee_id_unique UNIQUE (employee_id);


--
-- Name: employee_security_setup employee_security_setup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_security_setup
    ADD CONSTRAINT employee_security_setup_pkey PRIMARY KEY (id);


--
-- Name: employee_task_assignments employee_task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_task_assignments
    ADD CONSTRAINT employee_task_assignments_pkey PRIMARY KEY (id);


--
-- Name: employee_training_records employee_training_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_training_records
    ADD CONSTRAINT employee_training_records_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: escalation_rules escalation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation_rules
    ADD CONSTRAINT escalation_rules_pkey PRIMARY KEY (id);


--
-- Name: essential_eight_assessments essential_eight_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.essential_eight_assessments
    ADD CONSTRAINT essential_eight_assessments_pkey PRIMARY KEY (id);


--
-- Name: evidence_comments evidence_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_comments
    ADD CONSTRAINT evidence_comments_pkey PRIMARY KEY (id);


--
-- Name: evidence_files evidence_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_files
    ADD CONSTRAINT evidence_files_pkey PRIMARY KEY (id);


--
-- Name: evidence evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence
    ADD CONSTRAINT evidence_pkey PRIMARY KEY (id);


--
-- Name: evidence_requests evidence_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_requests
    ADD CONSTRAINT evidence_requests_pkey PRIMARY KEY (id);


--
-- Name: evidence_templates evidence_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_templates
    ADD CONSTRAINT evidence_templates_pkey PRIMARY KEY (id);


--
-- Name: federal_contracts federal_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_contracts
    ADD CONSTRAINT federal_contracts_pkey PRIMARY KEY (id);


--
-- Name: federal_disa_stig_checklists federal_disa_stig_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_disa_stig_checklists
    ADD CONSTRAINT federal_disa_stig_checklists_pkey PRIMARY KEY (id);


--
-- Name: federal_disa_stig_items federal_disa_stig_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_disa_stig_items
    ADD CONSTRAINT federal_disa_stig_items_pkey PRIMARY KEY (id);


--
-- Name: federal_fedramp_packages federal_fedramp_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_fedramp_packages
    ADD CONSTRAINT federal_fedramp_packages_pkey PRIMARY KEY (id);


--
-- Name: federal_fips_140_module_assets federal_fips_140_module_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_fips_140_module_assets
    ADD CONSTRAINT federal_fips_140_module_assets_pkey PRIMARY KEY (id);


--
-- Name: federal_fips_140_modules federal_fips_140_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_fips_140_modules
    ADD CONSTRAINT federal_fips_140_modules_pkey PRIMARY KEY (id);


--
-- Name: federal_fips_categorizations federal_fips_categorizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_fips_categorizations
    ADD CONSTRAINT federal_fips_categorizations_pkey PRIMARY KEY (id);


--
-- Name: federal_fips_categorizations federal_fips_categorizations_ssp_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_fips_categorizations
    ADD CONSTRAINT federal_fips_categorizations_ssp_id_key UNIQUE (ssp_id);


--
-- Name: federal_fisma_reports federal_fisma_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_fisma_reports
    ADD CONSTRAINT federal_fisma_reports_pkey PRIMARY KEY (id);


--
-- Name: federal_fisma_systems federal_fisma_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_fisma_systems
    ADD CONSTRAINT federal_fisma_systems_pkey PRIMARY KEY (id);


--
-- Name: federal_inheritances federal_inheritances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_inheritances
    ADD CONSTRAINT federal_inheritances_pkey PRIMARY KEY (id);


--
-- Name: federal_nist_800_53_assessments federal_nist_800_53_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_nist_800_53_assessments
    ADD CONSTRAINT federal_nist_800_53_assessments_pkey PRIMARY KEY (id);


--
-- Name: federal_poams federal_poams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_poams
    ADD CONSTRAINT federal_poams_pkey PRIMARY KEY (id);


--
-- Name: federal_rmf_workflows federal_rmf_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_rmf_workflows
    ADD CONSTRAINT federal_rmf_workflows_pkey PRIMARY KEY (id);


--
-- Name: federal_sar_findings federal_sar_findings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_sar_findings
    ADD CONSTRAINT federal_sar_findings_pkey PRIMARY KEY (id);


--
-- Name: federal_sar_findings federal_sar_findings_sar_control_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_sar_findings
    ADD CONSTRAINT federal_sar_findings_sar_control_unique UNIQUE (sar_id, control_id);


--
-- Name: federal_sars federal_sars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_sars
    ADD CONSTRAINT federal_sars_pkey PRIMARY KEY (id);


--
-- Name: federal_sprs_assessments federal_sprs_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_sprs_assessments
    ADD CONSTRAINT federal_sprs_assessments_pkey PRIMARY KEY (id);


--
-- Name: federal_ssp_controls federal_ssp_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_ssp_controls
    ADD CONSTRAINT federal_ssp_controls_pkey PRIMARY KEY (id);


--
-- Name: federal_ssp_sections federal_ssp_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_ssp_sections
    ADD CONSTRAINT federal_ssp_sections_pkey PRIMARY KEY (id);


--
-- Name: federal_ssps federal_ssps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_ssps
    ADD CONSTRAINT federal_ssps_pkey PRIMARY KEY (id);


--
-- Name: financial_impacts financial_impacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_impacts
    ADD CONSTRAINT financial_impacts_pkey PRIMARY KEY (id);


--
-- Name: fips_199_information_types_ref fips_199_information_types_ref_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fips_199_information_types_ref
    ADD CONSTRAINT fips_199_information_types_ref_code_key UNIQUE (code);


--
-- Name: fips_199_information_types_ref fips_199_information_types_ref_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fips_199_information_types_ref
    ADD CONSTRAINT fips_199_information_types_ref_pkey PRIMARY KEY (id);


--
-- Name: fips_categorizations fips_categorizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fips_categorizations
    ADD CONSTRAINT fips_categorizations_pkey PRIMARY KEY (id);


--
-- Name: framework_knowledge_mappings framework_knowledge_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_knowledge_mappings
    ADD CONSTRAINT framework_knowledge_mappings_pkey PRIMARY KEY (id);


--
-- Name: framework_mappings_deprecated framework_mappings_deprecated_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_mappings_deprecated
    ADD CONSTRAINT framework_mappings_deprecated_pkey PRIMARY KEY (id);


--
-- Name: framework_mappings framework_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_mappings
    ADD CONSTRAINT framework_mappings_pkey PRIMARY KEY (id);


--
-- Name: framework_requirements framework_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_requirements
    ADD CONSTRAINT framework_requirements_pkey PRIMARY KEY (id);


--
-- Name: gap_assessments gap_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gap_assessments
    ADD CONSTRAINT gap_assessments_pkey PRIMARY KEY (id);


--
-- Name: gap_questionnaire_requests gap_questionnaire_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gap_questionnaire_requests
    ADD CONSTRAINT gap_questionnaire_requests_pkey PRIMARY KEY (id);


--
-- Name: gap_questionnaire_requests gap_questionnaire_requests_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gap_questionnaire_requests
    ADD CONSTRAINT gap_questionnaire_requests_token_unique UNIQUE (token);


--
-- Name: gap_responses gap_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gap_responses
    ADD CONSTRAINT gap_responses_pkey PRIMARY KEY (id);


--
-- Name: global_contacts global_contacts_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_contacts
    ADD CONSTRAINT global_contacts_email_unique UNIQUE (email);


--
-- Name: global_contacts global_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_contacts
    ADD CONSTRAINT global_contacts_pkey PRIMARY KEY (id);


--
-- Name: global_crm_activities global_crm_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_crm_activities
    ADD CONSTRAINT global_crm_activities_pkey PRIMARY KEY (id);


--
-- Name: global_crm_contact_tags global_crm_contact_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_crm_contact_tags
    ADD CONSTRAINT global_crm_contact_tags_pkey PRIMARY KEY (id);


--
-- Name: global_crm_deals global_crm_deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_crm_deals
    ADD CONSTRAINT global_crm_deals_pkey PRIMARY KEY (id);


--
-- Name: global_crm_notes global_crm_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_crm_notes
    ADD CONSTRAINT global_crm_notes_pkey PRIMARY KEY (id);


--
-- Name: global_crm_tags global_crm_tags_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_crm_tags
    ADD CONSTRAINT global_crm_tags_name_unique UNIQUE (name);


--
-- Name: global_crm_tags global_crm_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_crm_tags
    ADD CONSTRAINT global_crm_tags_pkey PRIMARY KEY (id);


--
-- Name: global_vendors global_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_vendors
    ADD CONSTRAINT global_vendors_pkey PRIMARY KEY (id);


--
-- Name: governance_events governance_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.governance_events
    ADD CONSTRAINT governance_events_pkey PRIMARY KEY (id);


--
-- Name: gumroad_webhook_events gumroad_webhook_events_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gumroad_webhook_events
    ADD CONSTRAINT gumroad_webhook_events_event_id_key UNIQUE (event_id);


--
-- Name: gumroad_webhook_events gumroad_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gumroad_webhook_events
    ADD CONSTRAINT gumroad_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: impact_assessments impact_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_assessments
    ADD CONSTRAINT impact_assessments_pkey PRIMARY KEY (id);


--
-- Name: implementation_phases implementation_phases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.implementation_phases
    ADD CONSTRAINT implementation_phases_pkey PRIMARY KEY (id);


--
-- Name: implementation_plans implementation_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.implementation_plans
    ADD CONSTRAINT implementation_plans_pkey PRIMARY KEY (id);


--
-- Name: implementation_progress implementation_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.implementation_progress
    ADD CONSTRAINT implementation_progress_pkey PRIMARY KEY (id);


--
-- Name: implementation_tasks implementation_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.implementation_tasks
    ADD CONSTRAINT implementation_tasks_pkey PRIMARY KEY (id);


--
-- Name: implementation_templates implementation_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.implementation_templates
    ADD CONSTRAINT implementation_templates_pkey PRIMARY KEY (id);


--
-- Name: incidents incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);


--
-- Name: intake_items intake_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_items
    ADD CONSTRAINT intake_items_pkey PRIMARY KEY (id);


--
-- Name: integration_definitions integration_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_definitions
    ADD CONSTRAINT integration_definitions_pkey PRIMARY KEY (id);


--
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- Name: international_transfers international_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.international_transfers
    ADD CONSTRAINT international_transfers_pkey PRIMARY KEY (id);


--
-- Name: issue_tracker_connections issue_tracker_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_tracker_connections
    ADD CONSTRAINT issue_tracker_connections_pkey PRIMARY KEY (id);


--
-- Name: knowledge_articles knowledge_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_articles
    ADD CONSTRAINT knowledge_articles_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base_entries knowledge_base_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base_entries
    ADD CONSTRAINT knowledge_base_entries_pkey PRIMARY KEY (id);


--
-- Name: kris kris_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kris
    ADD CONSTRAINT kris_pkey PRIMARY KEY (id);


--
-- Name: license_activations license_activations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_activations
    ADD CONSTRAINT license_activations_pkey PRIMARY KEY (id);


--
-- Name: license_configurations license_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_configurations
    ADD CONSTRAINT license_configurations_pkey PRIMARY KEY (id);


--
-- Name: license_feature_usage license_feature_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_feature_usage
    ADD CONSTRAINT license_feature_usage_pkey PRIMARY KEY (id);


--
-- Name: license_status_enum license_status_enum_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_status_enum
    ADD CONSTRAINT license_status_enum_name_key UNIQUE (name);


--
-- Name: license_status_enum license_status_enum_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_status_enum
    ADD CONSTRAINT license_status_enum_pkey PRIMARY KEY (id);


--
-- Name: license_type_enum license_type_enum_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_type_enum
    ADD CONSTRAINT license_type_enum_name_key UNIQUE (name);


--
-- Name: license_type_enum license_type_enum_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_type_enum
    ADD CONSTRAINT license_type_enum_pkey PRIMARY KEY (id);


--
-- Name: license_validation_logs license_validation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_validation_logs
    ADD CONSTRAINT license_validation_logs_pkey PRIMARY KEY (id);


--
-- Name: llm_providers llm_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llm_providers
    ADD CONSTRAINT llm_providers_pkey PRIMARY KEY (id);


--
-- Name: llm_router_rules llm_router_rules_feature_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llm_router_rules
    ADD CONSTRAINT llm_router_rules_feature_unique UNIQUE (feature);


--
-- Name: llm_router_rules llm_router_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llm_router_rules
    ADD CONSTRAINT llm_router_rules_pkey PRIMARY KEY (id);


--
-- Name: magic_link_redemptions magic_link_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_link_redemptions
    ADD CONSTRAINT magic_link_redemptions_pkey PRIMARY KEY (id);


--
-- Name: magic_links magic_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_links
    ADD CONSTRAINT magic_links_pkey PRIMARY KEY (id);


--
-- Name: magic_links magic_links_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_links
    ADD CONSTRAINT magic_links_token_unique UNIQUE (token);


--
-- Name: maturity_assessments maturity_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_assessments
    ADD CONSTRAINT maturity_assessments_pkey PRIMARY KEY (id);


--
-- Name: maturity_categories maturity_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_categories
    ADD CONSTRAINT maturity_categories_pkey PRIMARY KEY (id);


--
-- Name: maturity_client_frameworks maturity_client_frameworks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_client_frameworks
    ADD CONSTRAINT maturity_client_frameworks_pkey PRIMARY KEY (id);


--
-- Name: maturity_frameworks maturity_frameworks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_frameworks
    ADD CONSTRAINT maturity_frameworks_pkey PRIMARY KEY (id);


--
-- Name: maturity_requirements maturity_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_requirements
    ADD CONSTRAINT maturity_requirements_pkey PRIMARY KEY (id);


--
-- Name: maturity_simulations maturity_simulations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_simulations
    ADD CONSTRAINT maturity_simulations_pkey PRIMARY KEY (id);


--
-- Name: nda_signatures nda_signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nda_signatures
    ADD CONSTRAINT nda_signatures_pkey PRIMARY KEY (id);


--
-- Name: nis2_mappings nis2_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nis2_mappings
    ADD CONSTRAINT nis2_mappings_pkey PRIMARY KEY (id);


--
-- Name: nist_80030_impact_assessments nist_80030_impact_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nist_80030_impact_assessments
    ADD CONSTRAINT nist_80030_impact_assessments_pkey PRIMARY KEY (id);


--
-- Name: nist_80030_threat_events nist_80030_threat_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nist_80030_threat_events
    ADD CONSTRAINT nist_80030_threat_events_pkey PRIMARY KEY (id);


--
-- Name: nist_80030_threat_sources nist_80030_threat_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nist_80030_threat_sources
    ADD CONSTRAINT nist_80030_threat_sources_pkey PRIMARY KEY (id);


--
-- Name: federal_nist_800_53_assessments nist_80053_assessment_ssp_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_nist_800_53_assessments
    ADD CONSTRAINT nist_80053_assessment_ssp_unique UNIQUE (ssp_id);


--
-- Name: nist_tiers nist_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nist_tiers
    ADD CONSTRAINT nist_tiers_pkey PRIMARY KEY (id);


--
-- Name: notification_log notification_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: nvd_cve_cache nvd_cve_cache_cve_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nvd_cve_cache
    ADD CONSTRAINT nvd_cve_cache_cve_id_unique UNIQUE (cve_id);


--
-- Name: nvd_cve_cache nvd_cve_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nvd_cve_cache
    ADD CONSTRAINT nvd_cve_cache_pkey PRIMARY KEY (id);


--
-- Name: org_roles org_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_roles
    ADD CONSTRAINT org_roles_pkey PRIMARY KEY (id);


--
-- Name: plan_change_log plan_change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_change_log
    ADD CONSTRAINT plan_change_log_pkey PRIMARY KEY (id);


--
-- Name: plan_exercises plan_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_exercises
    ADD CONSTRAINT plan_exercises_pkey PRIMARY KEY (id);


--
-- Name: plan_versions plan_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_pkey PRIMARY KEY (id);


--
-- Name: poam_items poam_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poam_items
    ADD CONSTRAINT poam_items_pkey PRIMARY KEY (id);


--
-- Name: policy_assignments policy_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_assignments
    ADD CONSTRAINT policy_assignments_pkey PRIMARY KEY (id);


--
-- Name: policy_exceptions policy_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_exceptions
    ADD CONSTRAINT policy_exceptions_pkey PRIMARY KEY (id);


--
-- Name: policy_review_results policy_review_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_review_results
    ADD CONSTRAINT policy_review_results_pkey PRIMARY KEY (id);


--
-- Name: policy_reviews policy_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_reviews
    ADD CONSTRAINT policy_reviews_pkey PRIMARY KEY (id);


--
-- Name: policy_reviews policy_reviews_policy_review_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_reviews
    ADD CONSTRAINT policy_reviews_policy_review_id_unique UNIQUE (policy_review_id);


--
-- Name: policy_templates policy_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_templates
    ADD CONSTRAINT policy_templates_pkey PRIMARY KEY (id);


--
-- Name: policy_templates policy_templates_template_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_templates
    ADD CONSTRAINT policy_templates_template_id_unique UNIQUE (template_id);


--
-- Name: policy_versions policy_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_versions
    ADD CONSTRAINT policy_versions_pkey PRIMARY KEY (id);


--
-- Name: privacy_assessments privacy_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_assessments
    ADD CONSTRAINT privacy_assessments_pkey PRIMARY KEY (id);


--
-- Name: process_data_flows process_data_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_data_flows
    ADD CONSTRAINT process_data_flows_pkey PRIMARY KEY (id);


--
-- Name: process_dependencies process_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_dependencies
    ADD CONSTRAINT process_dependencies_pkey PRIMARY KEY (id);


--
-- Name: processing_activities processing_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_activities
    ADD CONSTRAINT processing_activities_pkey PRIMARY KEY (id);


--
-- Name: processing_activity_assets processing_activity_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_activity_assets
    ADD CONSTRAINT processing_activity_assets_pkey PRIMARY KEY (id);


--
-- Name: processing_activity_vendors processing_activity_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_activity_vendors
    ADD CONSTRAINT processing_activity_vendors_pkey PRIMARY KEY (id);


--
-- Name: program_guide_assignments program_guide_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_guide_assignments
    ADD CONSTRAINT program_guide_assignments_pkey PRIMARY KEY (id);


--
-- Name: project_compliance_mappings project_compliance_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_compliance_mappings
    ADD CONSTRAINT project_compliance_mappings_pkey PRIMARY KEY (id);


--
-- Name: project_tasks project_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_questions questionnaire_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_questions
    ADD CONSTRAINT questionnaire_questions_pkey PRIMARY KEY (id);


--
-- Name: questionnaires questionnaires_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaires
    ADD CONSTRAINT questionnaires_pkey PRIMARY KEY (id);


--
-- Name: readiness_assessments readiness_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readiness_assessments
    ADD CONSTRAINT readiness_assessments_pkey PRIMARY KEY (id);


--
-- Name: recovery_objectives recovery_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recovery_objectives
    ADD CONSTRAINT recovery_objectives_pkey PRIMARY KEY (id);


--
-- Name: regulation_mappings regulation_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_mappings
    ADD CONSTRAINT regulation_mappings_pkey PRIMARY KEY (id);


--
-- Name: remediation_plans remediation_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remediation_plans
    ADD CONSTRAINT remediation_plans_pkey PRIMARY KEY (id);


--
-- Name: remediation_playbooks remediation_playbooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remediation_playbooks
    ADD CONSTRAINT remediation_playbooks_pkey PRIMARY KEY (id);


--
-- Name: remediation_tasks remediation_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remediation_tasks
    ADD CONSTRAINT remediation_tasks_pkey PRIMARY KEY (id);


--
-- Name: report_logs report_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_logs
    ADD CONSTRAINT report_logs_pkey PRIMARY KEY (id);


--
-- Name: risk_assessments risk_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_pkey PRIMARY KEY (id);


--
-- Name: risk_policy_mappings risk_policy_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_policy_mappings
    ADD CONSTRAINT risk_policy_mappings_pkey PRIMARY KEY (id);


--
-- Name: risk_reports risk_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_reports
    ADD CONSTRAINT risk_reports_pkey PRIMARY KEY (id);


--
-- Name: risk_scenario_links risk_scenario_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_scenario_links
    ADD CONSTRAINT risk_scenario_links_pkey PRIMARY KEY (id);


--
-- Name: risk_scenarios risk_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_scenarios
    ADD CONSTRAINT risk_scenarios_pkey PRIMARY KEY (id);


--
-- Name: risk_settings risk_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_settings
    ADD CONSTRAINT risk_settings_pkey PRIMARY KEY (id);


--
-- Name: risk_treatments risk_treatments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_treatments
    ADD CONSTRAINT risk_treatments_pkey PRIMARY KEY (id);


--
-- Name: roadmap_items roadmap_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_items
    ADD CONSTRAINT roadmap_items_pkey PRIMARY KEY (id);


--
-- Name: roadmap_milestones roadmap_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_milestones
    ADD CONSTRAINT roadmap_milestones_pkey PRIMARY KEY (id);


--
-- Name: roadmap_reports roadmap_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_reports
    ADD CONSTRAINT roadmap_reports_pkey PRIMARY KEY (id);


--
-- Name: roadmaps roadmaps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmaps
    ADD CONSTRAINT roadmaps_pkey PRIMARY KEY (id);


--
-- Name: samm_maturity_assessments samm_maturity_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samm_maturity_assessments
    ADD CONSTRAINT samm_maturity_assessments_pkey PRIMARY KEY (id);


--
-- Name: samm_practices samm_practices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samm_practices
    ADD CONSTRAINT samm_practices_pkey PRIMARY KEY (id);


--
-- Name: samm_practices samm_practices_practice_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samm_practices
    ADD CONSTRAINT samm_practices_practice_id_key UNIQUE (practice_id);


--
-- Name: samm_stream_assessments samm_stream_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samm_stream_assessments
    ADD CONSTRAINT samm_stream_assessments_pkey PRIMARY KEY (id);


--
-- Name: samm_stream_questions samm_stream_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samm_stream_questions
    ADD CONSTRAINT samm_stream_questions_pkey PRIMARY KEY (id);


--
-- Name: strategic_reports strategic_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_reports
    ADD CONSTRAINT strategic_reports_pkey PRIMARY KEY (id);


--
-- Name: system_feedback system_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_feedback
    ADD CONSTRAINT system_feedback_pkey PRIMARY KEY (id);


--
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: tech_suggestions tech_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tech_suggestions
    ADD CONSTRAINT tech_suggestions_pkey PRIMARY KEY (id);


--
-- Name: threat_intel_sync_log threat_intel_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threat_intel_sync_log
    ADD CONSTRAINT threat_intel_sync_log_pkey PRIMARY KEY (id);


--
-- Name: threat_model_components threat_model_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threat_model_components
    ADD CONSTRAINT threat_model_components_pkey PRIMARY KEY (id);


--
-- Name: threat_model_data_flows threat_model_data_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threat_model_data_flows
    ADD CONSTRAINT threat_model_data_flows_pkey PRIMARY KEY (id);


--
-- Name: threat_models threat_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threat_models
    ADD CONSTRAINT threat_models_pkey PRIMARY KEY (id);


--
-- Name: threats threats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threats
    ADD CONSTRAINT threats_pkey PRIMARY KEY (id);


--
-- Name: training_assignments training_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_assignments
    ADD CONSTRAINT training_assignments_pkey PRIMARY KEY (id);


--
-- Name: training_modules training_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_modules
    ADD CONSTRAINT training_modules_pkey PRIMARY KEY (id);


--
-- Name: transfer_impact_assessments transfer_impact_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_impact_assessments
    ADD CONSTRAINT transfer_impact_assessments_pkey PRIMARY KEY (id);


--
-- Name: treatment_controls treatment_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_controls
    ADD CONSTRAINT treatment_controls_pkey PRIMARY KEY (id);


--
-- Name: trust_center_visitors trust_center_visitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_center_visitors
    ADD CONSTRAINT trust_center_visitors_pkey PRIMARY KEY (id);


--
-- Name: trust_documents trust_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_documents
    ADD CONSTRAINT trust_documents_pkey PRIMARY KEY (id);


--
-- Name: user_clients user_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_clients
    ADD CONSTRAINT user_clients_pkey PRIMARY KEY (id);


--
-- Name: user_invitations user_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_pkey PRIMARY KEY (id);


--
-- Name: user_invitations user_invitations_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_token_unique UNIQUE (token);


--
-- Name: users users_open_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_open_id_unique UNIQUE (open_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendor_assessment_requests vendor_assessment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_assessment_requests
    ADD CONSTRAINT vendor_assessment_requests_pkey PRIMARY KEY (id);


--
-- Name: vendor_assessment_requests vendor_assessment_requests_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_assessment_requests
    ADD CONSTRAINT vendor_assessment_requests_token_unique UNIQUE (token);


--
-- Name: vendor_assessment_templates vendor_assessment_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_assessment_templates
    ADD CONSTRAINT vendor_assessment_templates_pkey PRIMARY KEY (id);


--
-- Name: vendor_assessments vendor_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_assessments
    ADD CONSTRAINT vendor_assessments_pkey PRIMARY KEY (id);


--
-- Name: vendor_authorizations vendor_authorizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_authorizations
    ADD CONSTRAINT vendor_authorizations_pkey PRIMARY KEY (id);


--
-- Name: vendor_breaches vendor_breaches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_breaches
    ADD CONSTRAINT vendor_breaches_pkey PRIMARY KEY (id);


--
-- Name: vendor_change_logs vendor_change_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_change_logs
    ADD CONSTRAINT vendor_change_logs_pkey PRIMARY KEY (id);


--
-- Name: vendor_contacts vendor_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contacts
    ADD CONSTRAINT vendor_contacts_pkey PRIMARY KEY (id);


--
-- Name: vendor_contracts vendor_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contracts
    ADD CONSTRAINT vendor_contracts_pkey PRIMARY KEY (id);


--
-- Name: vendor_cve_matches vendor_cve_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_cve_matches
    ADD CONSTRAINT vendor_cve_matches_pkey PRIMARY KEY (id);


--
-- Name: vendor_data_requests vendor_data_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_data_requests
    ADD CONSTRAINT vendor_data_requests_pkey PRIMARY KEY (id);


--
-- Name: vendor_data_requests vendor_data_requests_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_data_requests
    ADD CONSTRAINT vendor_data_requests_token_unique UNIQUE (token);


--
-- Name: vendor_dpas vendor_dpas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_dpas
    ADD CONSTRAINT vendor_dpas_pkey PRIMARY KEY (id);


--
-- Name: vendor_requests vendor_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_requests
    ADD CONSTRAINT vendor_requests_pkey PRIMARY KEY (id);


--
-- Name: vendor_scans vendor_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_scans
    ADD CONSTRAINT vendor_scans_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: vulnerabilities vulnerabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vulnerabilities
    ADD CONSTRAINT vulnerabilities_pkey PRIMARY KEY (id);


--
-- Name: waiting_list waiting_list_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waiting_list
    ADD CONSTRAINT waiting_list_email_unique UNIQUE (email);


--
-- Name: waiting_list waiting_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waiting_list
    ADD CONSTRAINT waiting_list_pkey PRIMARY KEY (id);


--
-- Name: work_items work_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_items
    ADD CONSTRAINT work_items_pkey PRIMARY KEY (id);


--
-- Name: messages messages_payload_exclusive; Type: CHECK CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages
    ADD CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL))) NOT VALID;


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: idx_acm_cve; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acm_cve ON public.asset_cve_matches USING btree (cve_id);


--
-- Name: idx_acm_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acm_status ON public.asset_cve_matches USING btree (status);


--
-- Name: idx_addon_runs_addon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addon_runs_addon ON public.addon_run_logs USING btree (addon_slug);


--
-- Name: idx_addon_runs_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addon_runs_client ON public.addon_run_logs USING btree (client_id);


--
-- Name: idx_addon_runs_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addon_runs_started ON public.addon_run_logs USING btree (started_at DESC);


--
-- Name: idx_addon_runs_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addon_runs_subscription ON public.addon_run_logs USING btree (subscription_id);


--
-- Name: idx_addon_sub_client_addon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addon_sub_client_addon ON public.addon_subscriptions USING btree (client_id, addon_slug);


--
-- Name: idx_addon_sub_next_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addon_sub_next_run ON public.addon_subscriptions USING btree (next_scheduled_run);


--
-- Name: idx_addon_sub_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addon_sub_status ON public.addon_subscriptions USING btree (status);


--
-- Name: idx_addon_sub_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_addon_sub_unique ON public.addon_subscriptions USING btree (client_id, addon_slug, status) WHERE ((status)::text = ANY ((ARRAY['trial'::character varying, 'active'::character varying])::text[]));


--
-- Name: idx_ai_usage_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_client ON public.ai_usage_metrics USING btree (client_id);


--
-- Name: idx_ai_usage_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_created ON public.ai_usage_metrics USING btree (created_at);


--
-- Name: idx_ai_usage_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_endpoint ON public.ai_usage_metrics USING btree (endpoint);


--
-- Name: idx_ai_usage_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_provider ON public.ai_usage_metrics USING btree (provider);


--
-- Name: idx_aiia_system; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aiia_system ON public.ai_impact_assessments USING btree (ai_system_id);


--
-- Name: idx_ais_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ais_client ON public.ai_systems USING btree (client_id);


--
-- Name: idx_aisc_control; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aisc_control ON public.ai_system_controls USING btree (control_id);


--
-- Name: idx_aisc_system; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aisc_system ON public.ai_system_controls USING btree (ai_system_id);


--
-- Name: idx_al_client_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_al_client_time ON public.audit_logs USING btree (client_id, created_at);


--
-- Name: idx_am_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_am_conversation ON public.advisor_messages USING btree (conversation_id);


--
-- Name: idx_ar_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ar_client_status ON public.approval_requests USING btree (client_id, status);


--
-- Name: idx_as_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_as_request ON public.approval_signatures USING btree (request_id);


--
-- Name: idx_as_signer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_as_signer ON public.approval_signatures USING btree (signer_id);


--
-- Name: idx_assessment_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_client ON public.vendor_assessments USING btree (client_id);


--
-- Name: idx_assessment_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_vendor ON public.vendor_assessments USING btree (vendor_id);


--
-- Name: idx_asset_cve_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_cve_asset ON public.asset_cve_matches USING btree (asset_id);


--
-- Name: idx_asset_cve_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_cve_client ON public.asset_cve_matches USING btree (client_id);


--
-- Name: idx_asset_cve_cve; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_cve_cve ON public.asset_cve_matches USING btree (cve_id);


--
-- Name: idx_asvs_client_req; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_asvs_client_req ON public.asvs_assessments USING btree (client_id, requirement_id);


--
-- Name: idx_asvs_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asvs_client_status ON public.asvs_assessments USING btree (client_id, status);


--
-- Name: idx_asvs_req_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asvs_req_category ON public.asvs_requirements USING btree (category_code);


--
-- Name: idx_asvs_req_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asvs_req_id ON public.asvs_requirements USING btree (requirement_id);


--
-- Name: idx_audit_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_client ON public.certification_audits USING btree (client_id);


--
-- Name: idx_audit_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_framework ON public.certification_audits USING btree (framework_id);


--
-- Name: idx_bps_plan_strat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bps_plan_strat ON public.bc_plan_strategies USING btree (plan_id, strategy_id);


--
-- Name: idx_bpsc_plan_scen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bpsc_plan_scen ON public.bc_plan_scenarios USING btree (plan_id, scenario_id);


--
-- Name: idx_breach_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_breach_vendor ON public.vendor_breaches USING btree (vendor_id);


--
-- Name: idx_cb_control; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cb_control ON public.control_baselines USING btree (control_id);


--
-- Name: idx_cc_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cc_client ON public.client_controls USING btree (client_id);


--
-- Name: idx_cc_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cc_client_status ON public.client_controls USING btree (client_id, status);


--
-- Name: idx_cfc_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cfc_framework ON public.client_framework_controls USING btree (framework_id);


--
-- Name: idx_cfm_cl_ctrl; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cfm_cl_ctrl ON public.client_framework_mappings USING btree (client_control_id);


--
-- Name: idx_cfm_fw_ctrl; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cfm_fw_ctrl ON public.client_framework_mappings USING btree (framework_control_id);


--
-- Name: idx_clc_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clc_client ON public.client_contacts USING btree (client_id);


--
-- Name: idx_client_settings_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_settings_client_id ON public.client_settings USING btree (client_id);


--
-- Name: idx_cm_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cm_source ON public.control_mappings USING btree (source_control_id);


--
-- Name: idx_cm_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cm_target ON public.control_mappings USING btree (target_control_id);


--
-- Name: idx_cm_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_cm_unique ON public.control_mappings USING btree (source_control_id, target_control_id);


--
-- Name: idx_comments_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_client ON public.comments USING btree (client_id);


--
-- Name: idx_comp_req_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comp_req_client ON public.compliance_requirements USING btree (client_id);


--
-- Name: idx_consent_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consent_client ON public.consents USING btree (client_id);


--
-- Name: idx_consent_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consent_status ON public.consents USING btree (status);


--
-- Name: idx_consent_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consent_subject ON public.consents USING btree (data_subject_id);


--
-- Name: idx_contact_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_vendor ON public.vendor_contacts USING btree (vendor_id);


--
-- Name: idx_contract_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_vendor ON public.vendor_contracts USING btree (vendor_id);


--
-- Name: idx_controls_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_controls_client ON public.controls USING btree (client_id);


--
-- Name: idx_controls_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_controls_framework ON public.controls USING btree (framework);


--
-- Name: idx_cp_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cp_client ON public.client_policies USING btree (client_id);


--
-- Name: idx_cp_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cp_client_status ON public.client_policies USING btree (client_id, status);


--
-- Name: idx_cpm_control; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cpm_control ON public.control_policy_mappings USING btree (client_control_id);


--
-- Name: idx_cpm_policy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cpm_policy ON public.control_policy_mappings USING btree (client_policy_id);


--
-- Name: idx_crm_activity_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_activity_client ON public.crm_activities USING btree (client_id);


--
-- Name: idx_crm_activity_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_activity_date ON public.crm_activities USING btree (occurred_at);


--
-- Name: idx_crm_contact_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_contact_client ON public.crm_contacts USING btree (client_id);


--
-- Name: idx_crm_contact_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_contact_email ON public.crm_contacts USING btree (email);


--
-- Name: idx_ctm_control_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ctm_control_framework ON public.control_tech_mappings USING btree (control_code, framework);


--
-- Name: idx_ctm_tech; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ctm_tech ON public.control_tech_mappings USING btree (tech_id);


--
-- Name: idx_dataflow_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dataflow_client ON public.data_flow_visualizations USING btree (client_id);


--
-- Name: idx_dataflow_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dataflow_process ON public.data_flow_visualizations USING btree (process_id);


--
-- Name: idx_dataflow_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dataflow_source ON public.data_flow_visualizations USING btree (source_system);


--
-- Name: idx_dataflow_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dataflow_target ON public.data_flow_visualizations USING btree (target_system);


--
-- Name: idx_db_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_db_client_status ON public.data_breaches USING btree (client_id, status);


--
-- Name: idx_dev_proj_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dev_proj_client ON public.dev_projects USING btree (client_id);


--
-- Name: idx_dpia_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dpia_client_status ON public.data_protection_impact_assessments USING btree (client_id, status);


--
-- Name: idx_dsar_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsar_client ON public.dsar_requests USING btree (client_id);


--
-- Name: idx_dsar_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsar_email ON public.dsar_requests USING btree (subject_email);


--
-- Name: idx_dsar_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsar_status ON public.dsar_requests USING btree (status);


--
-- Name: idx_e8_client_control; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_e8_client_control ON public.essential_eight_assessments USING btree (client_id, control_id);


--
-- Name: idx_emb_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emb_client ON public.embeddings USING btree (client_id);


--
-- Name: idx_emb_docid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emb_docid ON public.embeddings USING btree (doc_id);


--
-- Name: idx_emb_doctype; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emb_doctype ON public.embeddings USING btree (doc_type);


--
-- Name: idx_er_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_er_assignee ON public.evidence_requests USING btree (assignee_id);


--
-- Name: idx_er_client_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_er_client_active ON public.escalation_rules USING btree (client_id, is_active);


--
-- Name: idx_er_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_er_client_status ON public.evidence_requests USING btree (client_id, status);


--
-- Name: idx_er_control; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_er_control ON public.evidence_requests USING btree (client_control_id);


--
-- Name: idx_er_trigger; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_er_trigger ON public.escalation_rules USING btree (trigger);


--
-- Name: idx_ev_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ev_client ON public.evidence USING btree (client_id);


--
-- Name: idx_ev_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ev_client_status ON public.evidence USING btree (client_id, status);


--
-- Name: idx_evidence_comments_evidence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evidence_comments_evidence ON public.evidence_comments USING btree (evidence_id);


--
-- Name: idx_evidence_comments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evidence_comments_user ON public.evidence_comments USING btree (user_id);


--
-- Name: idx_fed_ctrcts_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fed_ctrcts_client ON public.federal_contracts USING btree (client_id);


--
-- Name: idx_fed_inh_client_pkg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fed_inh_client_pkg ON public.federal_inheritances USING btree (client_id, package_id);


--
-- Name: idx_feedback_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_status ON public.system_feedback USING btree (status);


--
-- Name: idx_feedback_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_type ON public.system_feedback USING btree (type);


--
-- Name: idx_findings_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_findings_client ON public.audit_findings USING btree (client_id);


--
-- Name: idx_findings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_findings_status ON public.audit_findings USING btree (status);


--
-- Name: idx_fkm_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fkm_source ON public.framework_knowledge_mappings USING btree (source_requirement_id);


--
-- Name: idx_fkm_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fkm_target ON public.framework_knowledge_mappings USING btree (target_type, target_value);


--
-- Name: idx_fm_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_source ON public.framework_mappings_deprecated USING btree (source_control_id);


--
-- Name: idx_fm_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_target ON public.framework_mappings_deprecated USING btree (target_control_id);


--
-- Name: idx_fm_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_unique ON public.framework_mappings_deprecated USING btree (source_control_id, target_control_id);


--
-- Name: idx_gc_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gc_email ON public.global_contacts USING btree (email);


--
-- Name: idx_gc_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gc_status ON public.global_contacts USING btree (status);


--
-- Name: idx_gcrm_act_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gcrm_act_contact ON public.global_crm_activities USING btree (contact_id);


--
-- Name: idx_gcrm_act_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gcrm_act_type ON public.global_crm_activities USING btree (type);


--
-- Name: idx_gcrm_contact_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_gcrm_contact_tag ON public.global_crm_contact_tags USING btree (contact_id, tag_id);


--
-- Name: idx_gcrm_deals_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gcrm_deals_contact ON public.global_crm_deals USING btree (contact_id);


--
-- Name: idx_gcrm_deals_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gcrm_deals_stage ON public.global_crm_deals USING btree (stage);


--
-- Name: idx_gcrm_notes_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gcrm_notes_contact ON public.global_crm_notes USING btree (contact_id);


--
-- Name: idx_ge_client_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ge_client_created ON public.governance_events USING btree (client_id, created_at);


--
-- Name: idx_ge_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ge_entity_type ON public.governance_events USING btree (entity_type);


--
-- Name: idx_gr_assess_ctrl; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gr_assess_ctrl ON public.gap_responses USING btree (assessment_id, control_id);


--
-- Name: idx_impl_plan_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_impl_plan_client_status ON public.implementation_plans USING btree (client_id, status);


--
-- Name: idx_impl_plan_roadmap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_impl_plan_roadmap ON public.implementation_plans USING btree (roadmap_id);


--
-- Name: idx_impl_progress_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_impl_progress_date ON public.implementation_progress USING btree (status_change_date);


--
-- Name: idx_impl_progress_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_impl_progress_plan ON public.implementation_progress USING btree (implementation_plan_id);


--
-- Name: idx_impl_task_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_impl_task_assignee ON public.implementation_tasks USING btree (assignee_id);


--
-- Name: idx_impl_task_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_impl_task_plan ON public.implementation_tasks USING btree (implementation_plan_id);


--
-- Name: idx_impl_task_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_impl_task_status ON public.implementation_tasks USING btree (status);


--
-- Name: idx_incidents_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidents_client ON public.incidents USING btree (client_id);


--
-- Name: idx_incidents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidents_status ON public.incidents USING btree (status);


--
-- Name: idx_intake_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intake_client ON public.intake_items USING btree (client_id);


--
-- Name: idx_intake_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intake_status ON public.intake_items USING btree (status);


--
-- Name: idx_integration_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_client ON public.client_integrations USING btree (client_id);


--
-- Name: idx_integrations_client_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_integrations_client_provider ON public.integrations USING btree (client_id, provider);


--
-- Name: idx_kb_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_client ON public.knowledge_base_entries USING btree (client_id);


--
-- Name: idx_kb_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_question ON public.knowledge_base_entries USING btree (question);


--
-- Name: idx_kev_cve_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kev_cve_id ON public.cisa_kev_cache USING btree (cve_id);


--
-- Name: idx_kri_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kri_client ON public.kris USING btree (client_id);


--
-- Name: idx_maturity_client_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_maturity_client_framework ON public.maturity_client_frameworks USING btree (client_id, framework_id);


--
-- Name: idx_maturity_client_framework_req; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_maturity_client_framework_req ON public.maturity_assessments USING btree (client_id, framework_id, requirement_id);


--
-- Name: idx_milestone_roadmap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestone_roadmap ON public.roadmap_milestones USING btree (roadmap_id);


--
-- Name: idx_milestone_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestone_target ON public.roadmap_milestones USING btree (target_date);


--
-- Name: idx_n80030_ia_client_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_n80030_ia_client_domain ON public.nist_80030_impact_assessments USING btree (client_id, domain);


--
-- Name: idx_n80030_te_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_n80030_te_client ON public.nist_80030_threat_events USING btree (client_id);


--
-- Name: idx_n80030_te_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_n80030_te_source ON public.nist_80030_threat_events USING btree (threat_source_id);


--
-- Name: idx_n80030_ts_client_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_n80030_ts_client_type ON public.nist_80030_threat_sources USING btree (client_id, type);


--
-- Name: idx_nist_tiers_client_function; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_nist_tiers_client_function ON public.nist_tiers USING btree (client_id, function_code);


--
-- Name: idx_ns_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ns_client ON public.notification_settings USING btree (client_id);


--
-- Name: idx_nvd_cve_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nvd_cve_id ON public.nvd_cve_cache USING btree (cve_id);


--
-- Name: idx_pa_activity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_pa_activity_id ON public.processing_activities USING btree (activity_id);


--
-- Name: idx_pa_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pa_client ON public.processing_activities USING btree (client_id);


--
-- Name: idx_pa_client_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pa_client_type ON public.privacy_assessments USING btree (client_id, type);


--
-- Name: idx_pa_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pa_employee ON public.policy_assignments USING btree (employee_id);


--
-- Name: idx_pa_policy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pa_policy ON public.policy_assignments USING btree (policy_id);


--
-- Name: idx_pa_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pa_status ON public.processing_activities USING btree (status);


--
-- Name: idx_paa_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paa_asset ON public.processing_activity_assets USING btree (asset_id);


--
-- Name: idx_paa_pa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paa_pa ON public.processing_activity_assets USING btree (processing_activity_id);


--
-- Name: idx_pav_pa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pav_pa ON public.processing_activity_vendors USING btree (processing_activity_id);


--
-- Name: idx_pav_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pav_vendor ON public.processing_activity_vendors USING btree (vendor_id);


--
-- Name: idx_pcm_dev_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pcm_dev_project ON public.project_compliance_mappings USING btree (dev_project_id);


--
-- Name: idx_pcm_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pcm_project ON public.project_compliance_mappings USING btree (project_id);


--
-- Name: idx_pdf_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdf_asset ON public.process_data_flows USING btree (asset_id);


--
-- Name: idx_pdf_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdf_process ON public.process_data_flows USING btree (process_id);


--
-- Name: idx_pe_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pe_employee ON public.policy_exceptions USING btree (employee_id);


--
-- Name: idx_pe_policy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pe_policy ON public.policy_exceptions USING btree (policy_id);


--
-- Name: idx_pe_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pe_status ON public.policy_exceptions USING btree (status);


--
-- Name: idx_pga_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pga_client ON public.program_guide_assignments USING btree (client_id);


--
-- Name: idx_pga_unique_step; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_pga_unique_step ON public.program_guide_assignments USING btree (client_id, guide_type, step_id);


--
-- Name: idx_phase_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phase_framework ON public.implementation_phases USING btree (framework_id);


--
-- Name: idx_projects_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_client ON public.projects USING btree (client_id);


--
-- Name: idx_pt_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pt_assignee ON public.project_tasks USING btree (assignee_id);


--
-- Name: idx_pt_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pt_client_status ON public.project_tasks USING btree (client_id, status);


--
-- Name: idx_qn_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qn_client ON public.questionnaires USING btree (client_id);


--
-- Name: idx_qn_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qn_status ON public.questionnaires USING btree (status);


--
-- Name: idx_qq_questionnaire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qq_questionnaire ON public.questionnaire_questions USING btree (questionnaire_id);


--
-- Name: idx_ra_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ra_client ON public.risk_assessments USING btree (client_id);


--
-- Name: idx_ra_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ra_client_status ON public.risk_assessments USING btree (client_id, status);


--
-- Name: idx_ra_next_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ra_next_review ON public.risk_assessments USING btree (next_review_date);


--
-- Name: idx_ra_risk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ra_risk ON public.risk_assessments USING btree (risk_id);


--
-- Name: idx_ra_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ra_status ON public.risk_assessments USING btree (status);


--
-- Name: idx_req_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_req_framework ON public.framework_requirements USING btree (framework_id);


--
-- Name: idx_req_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_req_phase ON public.framework_requirements USING btree (phase_id);


--
-- Name: idx_rl_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rl_client ON public.report_logs USING btree (client_id);


--
-- Name: idx_rl_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rl_type ON public.report_logs USING btree (report_type);


--
-- Name: idx_roadmap_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_client_status ON public.roadmaps USING btree (client_id, status);


--
-- Name: idx_roadmap_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_framework ON public.roadmaps USING btree (framework);


--
-- Name: idx_rpm_policy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpm_policy ON public.risk_policy_mappings USING btree (client_policy_id);


--
-- Name: idx_rpm_risk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpm_risk ON public.risk_policy_mappings USING btree (risk_assessment_id);


--
-- Name: idx_rr_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rr_client ON public.roadmap_reports USING btree (client_id);


--
-- Name: idx_rr_generated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rr_generated_by ON public.roadmap_reports USING btree (generated_by);


--
-- Name: idx_rr_roadmap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rr_roadmap ON public.roadmap_reports USING btree (roadmap_id);


--
-- Name: idx_rs_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rs_client ON public.risk_scenarios USING btree (client_id);


--
-- Name: idx_rs_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rs_client_status ON public.risk_scenarios USING btree (client_id, status);


--
-- Name: idx_rsettings_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rsettings_client ON public.risk_settings USING btree (client_id);


--
-- Name: idx_rsl_risk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rsl_risk ON public.risk_scenario_links USING btree (risk_id);


--
-- Name: idx_rsl_scenario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rsl_scenario ON public.risk_scenario_links USING btree (scenario_id);


--
-- Name: idx_rsl_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rsl_unique ON public.risk_scenario_links USING btree (risk_id, scenario_id);


--
-- Name: idx_rt_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rt_assignee ON public.remediation_tasks USING btree (assignee_id);


--
-- Name: idx_rt_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rt_client_status ON public.remediation_tasks USING btree (client_id, status);


--
-- Name: idx_samm_client_practice; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_samm_client_practice ON public.samm_maturity_assessments USING btree (client_id, practice_id);


--
-- Name: idx_samm_client_practice_stream; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_samm_client_practice_stream ON public.samm_stream_assessments USING btree (client_id, practice_id, stream_id);


--
-- Name: idx_samm_practice_stream_level; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_samm_practice_stream_level ON public.samm_stream_questions USING btree (practice_id, stream_id, level);


--
-- Name: idx_scan_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_vendor ON public.vendor_scans USING btree (vendor_id);


--
-- Name: idx_strat_rep_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strat_rep_client ON public.strategic_reports USING btree (client_id);


--
-- Name: idx_strat_rep_roadmap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strat_rep_roadmap ON public.strategic_reports USING btree (roadmap_id);


--
-- Name: idx_ta_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ta_client ON public.task_assignments USING btree (client_id);


--
-- Name: idx_ta_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ta_user ON public.task_assignments USING btree (user_id);


--
-- Name: idx_tc_control; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tc_control ON public.treatment_controls USING btree (control_id);


--
-- Name: idx_tc_treatment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tc_treatment ON public.treatment_controls USING btree (treatment_id);


--
-- Name: idx_threat_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_threat_client ON public.threats USING btree (client_id);


--
-- Name: idx_threat_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_threat_client_status ON public.threats USING btree (client_id, status);


--
-- Name: idx_tia_transfer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tia_transfer ON public.transfer_impact_assessments USING btree (transfer_id);


--
-- Name: idx_tm_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tm_client ON public.threat_models USING btree (client_id);


--
-- Name: idx_tm_comp_tm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tm_comp_tm ON public.threat_model_components USING btree (threat_model_id);


--
-- Name: idx_tm_df_tm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tm_df_tm ON public.threat_model_data_flows USING btree (threat_model_id);


--
-- Name: idx_tm_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tm_project ON public.threat_models USING btree (dev_project_id);


--
-- Name: idx_training_assignment_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_assignment_client ON public.training_assignments USING btree (client_id);


--
-- Name: idx_training_assignment_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_assignment_employee ON public.training_assignments USING btree (employee_id);


--
-- Name: idx_training_assignment_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_assignment_module ON public.training_assignments USING btree (module_id);


--
-- Name: idx_training_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_client ON public.employee_training_records USING btree (client_id);


--
-- Name: idx_training_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_employee ON public.employee_training_records USING btree (employee_id);


--
-- Name: idx_training_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_framework ON public.employee_training_records USING btree (framework_id);


--
-- Name: idx_training_module_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_module_client ON public.training_modules USING btree (client_id);


--
-- Name: idx_training_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_training_unique ON public.employee_training_records USING btree (employee_id, framework_id, section_id);


--
-- Name: idx_transfer_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfer_client ON public.international_transfers USING btree (client_id);


--
-- Name: idx_transfer_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfer_status ON public.international_transfers USING btree (status);


--
-- Name: idx_treatment_assessment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatment_assessment ON public.risk_treatments USING btree (risk_assessment_id);


--
-- Name: idx_treatment_scenario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatment_scenario ON public.risk_treatments USING btree (risk_scenario_id);


--
-- Name: idx_ts_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ts_client ON public.tech_suggestions USING btree (client_id);


--
-- Name: idx_ts_control; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ts_control ON public.tech_suggestions USING btree (control_id);


--
-- Name: idx_uc_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uc_client ON public.user_clients USING btree (client_id);


--
-- Name: idx_uc_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uc_user ON public.user_clients USING btree (user_id);


--
-- Name: idx_va_client_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_va_client_vendor ON public.vendor_authorizations USING btree (client_id, vendor_id);


--
-- Name: idx_var_client_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_var_client_vendor ON public.vendor_assessment_requests USING btree (client_id, vendor_id);


--
-- Name: idx_var_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_var_status ON public.vendor_assessment_requests USING btree (status);


--
-- Name: idx_var_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_var_token ON public.vendor_assessment_requests USING btree (token);


--
-- Name: idx_vat_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vat_client ON public.vendor_assessment_templates USING btree (client_id);


--
-- Name: idx_vcl_client_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vcl_client_vendor ON public.vendor_change_logs USING btree (client_id, vendor_id);


--
-- Name: idx_vdpa_client_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vdpa_client_vendor ON public.vendor_dpas USING btree (client_id, vendor_id);


--
-- Name: idx_vdr_client_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vdr_client_vendor ON public.vendor_data_requests USING btree (client_id, vendor_id);


--
-- Name: idx_vdr_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_vdr_token ON public.vendor_data_requests USING btree (token);


--
-- Name: idx_vendor_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_client ON public.vendors USING btree (client_id);


--
-- Name: idx_vendor_cve; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_cve ON public.vendor_cve_matches USING btree (vendor_id);


--
-- Name: idx_vendor_cve_cve; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_cve_cve ON public.vendor_cve_matches USING btree (cve_id);


--
-- Name: idx_vendor_cve_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_cve_id ON public.vendor_cve_matches USING btree (cve_id);


--
-- Name: idx_vendor_cve_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_cve_vendor ON public.vendor_cve_matches USING btree (vendor_id);


--
-- Name: idx_vendor_request_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_request_client ON public.vendor_requests USING btree (client_id);


--
-- Name: idx_vendor_request_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_request_status ON public.vendor_requests USING btree (status);


--
-- Name: idx_vuln_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vuln_client ON public.vulnerabilities USING btree (client_id);


--
-- Name: idx_vuln_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vuln_client_status ON public.vulnerabilities USING btree (client_id, status);


--
-- Name: idx_wi_assigned_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wi_assigned_user ON public.work_items USING btree (assigned_to_user_id);


--
-- Name: idx_wi_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wi_client_status ON public.work_items USING btree (client_id, status);


--
-- Name: idx_wi_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wi_due_date ON public.work_items USING btree (due_date);


--
-- Name: integration_definitions_tenant_provider_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX integration_definitions_tenant_provider_unique ON public.integration_definitions USING btree (tenant_id, provider);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_selec; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_selec ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter, COALESCE(selected_columns, '{}'::text[]));


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: addon_run_logs addon_run_logs_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_run_logs
    ADD CONSTRAINT addon_run_logs_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.addon_subscriptions(id) ON DELETE SET NULL;


--
-- Name: data_flow_connections data_flow_connections_source_node_id_data_flow_nodes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_flow_connections
    ADD CONSTRAINT data_flow_connections_source_node_id_data_flow_nodes_id_fk FOREIGN KEY (source_node_id) REFERENCES public.data_flow_nodes(id);


--
-- Name: data_flow_connections data_flow_connections_target_node_id_data_flow_nodes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_flow_connections
    ADD CONSTRAINT data_flow_connections_target_node_id_data_flow_nodes_id_fk FOREIGN KEY (target_node_id) REFERENCES public.data_flow_nodes(id);


--
-- Name: email_triggers email_triggers_template_id_email_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_triggers
    ADD CONSTRAINT email_triggers_template_id_email_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.email_templates(id);


--
-- Name: email_triggers email_triggers_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_triggers
    ADD CONSTRAINT email_triggers_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id);


--
-- Name: federal_fips_140_module_assets federal_fips_140_module_assets_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_fips_140_module_assets
    ADD CONSTRAINT federal_fips_140_module_assets_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: federal_fips_140_module_assets federal_fips_140_module_assets_fips_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_fips_140_module_assets
    ADD CONSTRAINT federal_fips_140_module_assets_fips_module_id_fkey FOREIGN KEY (fips_module_id) REFERENCES public.federal_fips_140_modules(id) ON DELETE CASCADE;


--
-- Name: maturity_assessments maturity_assessments_framework_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_assessments
    ADD CONSTRAINT maturity_assessments_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES public.maturity_frameworks(id);


--
-- Name: maturity_assessments maturity_assessments_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_assessments
    ADD CONSTRAINT maturity_assessments_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.maturity_requirements(id);


--
-- Name: maturity_categories maturity_categories_framework_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_categories
    ADD CONSTRAINT maturity_categories_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES public.maturity_frameworks(id);


--
-- Name: maturity_client_frameworks maturity_client_frameworks_framework_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_client_frameworks
    ADD CONSTRAINT maturity_client_frameworks_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES public.maturity_frameworks(id);


--
-- Name: maturity_requirements maturity_requirements_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_requirements
    ADD CONSTRAINT maturity_requirements_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.maturity_categories(id);


--
-- Name: maturity_requirements maturity_requirements_framework_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_requirements
    ADD CONSTRAINT maturity_requirements_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES public.maturity_frameworks(id);


--
-- Name: processing_activities processing_activities_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_activities
    ADD CONSTRAINT processing_activities_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: questionnaire_questions questionnaire_questions_questionnaire_id_questionnaires_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_questions
    ADD CONSTRAINT questionnaire_questions_questionnaire_id_questionnaires_id_fk FOREIGN KEY (questionnaire_id) REFERENCES public.questionnaires(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict UxCZ7ZuSzzLjiwbb0Jw16aQqD4SpV5ZL9VedrLYMlDyOzS4UQ9AxH3JU7Vo0La4

