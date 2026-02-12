Param(
  [string]$ContainerName = "openclaw_gateway",
  [string]$AgentName = "Security Advisor",
  [string]$Model = "anthropic/claude-sonnet-4-5"
)

docker exec $ContainerName sh -lc "openclaw setup --wizard --non-interactive || true"
docker exec $ContainerName sh -lc "openclaw agents add \"$AgentName\""
docker exec $ContainerName sh -lc "openclaw models set --agent \"$AgentName\" $Model"
docker exec $ContainerName sh -lc "openclaw agents list"
