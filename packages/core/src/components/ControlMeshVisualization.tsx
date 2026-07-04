import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@complianceos/ui/ui/select';
import { Skeleton } from '@complianceos/ui/ui/skeleton';
import { Share2, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

// ---- Types ----
interface MeshNode {
  id: string;
  label: string;
  type: 'control' | 'requirement' | 'framework';
  framework: string;
  status?: string;
  group?: string;
}

interface MeshEdge {
  source: string;
  target: string;
  label: string;
  type: 'maps_to' | 'satisfies';
}

interface ControlMeshResult {
  nodes: MeshNode[];
  edges: MeshEdge[];
}

// ---- Constants ----
const FRAMEWORK_COLORS: Record<string, string> = {
  ISO: '#2563eb',
  ISO27001: '#2563eb',
  SOC2: '#16a34a',
  NIST: '#7c3aed',
  NIST80053: '#7c3aed',
  GDPR: '#dc2626',
  PCI: '#ea580c',
  HIPAA: '#0891b2',
};

const NODE_RADIUS = {
  framework: 28,
  control: 18,
  requirement: 12,
};

const EDGE_WIDTH: Record<string, number> = {
  equivalent: 3,
  exact: 3,
  subset: 2,
  superset: 2,
  partial: 1.5,
  related: 1,
  satisfies: 2,
};

const FRAMEWORK_NAMES: Record<string, string> = {
  ISO: 'ISO 27001',
  ISO27001: 'ISO 27001',
  SOC2: 'SOC 2',
  NIST: 'NIST 800-53',
  NIST80053: 'NIST 800-53',
  GDPR: 'GDPR',
  PCI: 'PCI DSS',
  HIPAA: 'HIPAA',
};

// ---- Force Simulation Helpers ----
interface Vec2 {
  x: number;
  y: number;
}

function forceSimulation(
  nodes: MeshNode[],
  edges: MeshEdge[],
  width: number,
  height: number
): Map<string, Vec2> {
  const positions = new Map<string, Vec2>();
  const velocities = new Map<string, Vec2>();

  // Initialize positions in a radial layout
  const centerX = width / 2;
  const centerY = height / 2;
  const pad = 60;

  // Group nodes by type
  const frameworkNodes = nodes.filter((n) => n.type === 'framework');
  const controlNodes = nodes.filter((n) => n.type === 'control');
  const requirementNodes = nodes.filter((n) => n.type === 'requirement');

  // Framework nodes on outer ring
  const fwRadius = Math.min(width, height) * 0.35;
  frameworkNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / frameworkNodes.length - Math.PI / 2;
    positions.set(node.id, {
      x: centerX + fwRadius * Math.cos(angle),
      y: centerY + fwRadius * Math.sin(angle),
    });
    velocities.set(node.id, { x: 0, y: 0 });
  });

  // Control nodes in middle
  const ctrlRadius = Math.min(width, height) * 0.18;
  controlNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / controlNodes.length;
    positions.set(node.id, {
      x: centerX + ctrlRadius * Math.cos(angle),
      y: centerY + ctrlRadius * Math.sin(angle),
    });
    velocities.set(node.id, { x: 0, y: 0 });
  });

  // Requirement nodes on inner ring
  const reqRadius = Math.min(width, height) * 0.08;
  requirementNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / requirementNodes.length;
    positions.set(node.id, {
      x: centerX + reqRadius * Math.cos(angle),
      y: centerY + reqRadius * Math.sin(angle),
    });
    velocities.set(node.id, { x: 0, y: 0 });
  });

  // Build adjacency for attraction
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
    adjacency.get(edge.source)!.push(edge.target);
    adjacency.get(edge.target)!.push(edge.source);
  }

  // Run simulation iterations
  const iterations = 80;
  const repulsionStrength = 800;
  const attractionStrength = 0.02;
  const damping = 0.85;

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, Vec2>();
    for (const id of nodes.map((n) => n.id)) {
      forces.set(id, { x: 0, y: 0 });
    }

    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const pa = positions.get(a.id)!;
        const pb = positions.get(b.id)!;
        const dx = pa.x - pb.x;
        const dy = pa.y - pb.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsionStrength / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces.get(a.id)!.x += fx;
        forces.get(a.id)!.y += fy;
        forces.get(b.id)!.x -= fx;
        forces.get(b.id)!.y -= fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const pa = positions.get(edge.source);
      const pb = positions.get(edge.target);
      if (!pa || !pb) continue;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * attractionStrength;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      forces.get(edge.source)!.x += fx;
      forces.get(edge.source)!.y += fy;
      forces.get(edge.target)!.x -= fx;
      forces.get(edge.target)!.y -= fy;
    }

    // Apply forces with damping
    for (const id of nodes.map((n) => n.id)) {
      const v = velocities.get(id)!;
      const f = forces.get(id)!;
      v.x = (v.x + f.x) * damping;
      v.y = (v.y + f.y) * damping;
      const p = positions.get(id)!;
      p.x += v.x;
      p.y += v.y;

      // Clamp to bounds
      p.x = Math.max(pad, Math.min(width - pad, p.x));
      p.y = Math.max(pad, Math.min(height - pad, p.y));
    }
  }

  return positions;
}

// ---- Component ----
interface ControlMeshVisualizationProps {
  clientId: number;
  frameworkCode?: string;
  height?: number;
}

export function ControlMeshVisualization({
  clientId,
  frameworkCode,
  height = 600,
}: ControlMeshVisualizationProps) {
  const [selectedFramework, setSelectedFramework] = useState<string | undefined>(frameworkCode);
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<MeshNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<MeshNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const { data, isLoading, error, refetch } = trpc.controlMesh.getGraph.useQuery(
    { clientId, frameworkCode: selectedFramework },
    { enabled: !!clientId }
  );

  // Filter large graphs (>50 nodes)
  const filteredData = useMemo(() => {
    if (!data) return null;
    if (data.nodes.length <= 50) return data;

    // Show only framework + control nodes (hide requirements to reduce clutter)
    const keepIds = new Set<string>();
    const fwNodes = data.nodes.filter((n: MeshNode) => n.type === 'framework' || n.type === 'control');
    fwNodes.forEach((n: MeshNode) => keepIds.add(n.id));

    const edges = data.edges.filter(
      (e: MeshEdge) => keepIds.has(e.source) && keepIds.has(e.target)
    );

    return { nodes: fwNodes, edges };
  }, [data]);

  // Compute positions
  const positions = useMemo(() => {
    if (!filteredData) return new Map<string, Vec2>();
    const w = (svgRef.current?.clientWidth || 800) * 0.95;
    const h = height * 0.9;
    return forceSimulation(filteredData.nodes, filteredData.edges, w, h);
  }, [filteredData, height]);

  // Unique frameworks for selector
  const availableFrameworks = useMemo(() => {
    if (!data) return [];
    const fws = new Set<string>();
    data.nodes.forEach((n: MeshNode) => {
      if (n.framework) fws.add(n.framework);
    });
    return Array.from(fws);
  }, [data]);

  const getNodeColor = useCallback((node: MeshNode): string => {
    if (node.type === 'framework') return '#1e293b';
    return FRAMEWORK_COLORS[node.framework] || FRAMEWORK_COLORS[node.framework.toUpperCase()] || '#6b7280';
  }, []);

  const getNodeRadius = useCallback((node: MeshNode): number => {
    return NODE_RADIUS[node.type] || 14;
  }, []);

  const getEdgeWidth = useCallback((edge: MeshEdge): number => {
    return EDGE_WIDTH[edge.label] || EDGE_WIDTH[edge.type] || 1;
  }, []);

  const handleNodeClick = useCallback((node: MeshNode) => {
    setSelectedNode(node === selectedNode ? null : node);
  }, [selectedNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent, node: MeshNode) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top - 10 });
    setHoveredNode(node);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="space-y-4 w-full px-8">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="text-center space-y-3">
            <p className="text-destructive text-sm">Failed to load control mesh</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!filteredData || filteredData.nodes.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <p className="text-muted-foreground text-sm">No control mesh data available for this client.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-0 relative" style={{ height }}>
        {/* Controls toolbar */}
        <div className="absolute top-2 left-2 z-10 flex gap-2 items-center">
          <Select
            value={selectedFramework || 'all'}
            onValueChange={(val) => setSelectedFramework(val === 'all' ? undefined : val)}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="All frameworks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All frameworks</SelectItem>
              {availableFrameworks.map((fw) => (
                <SelectItem key={fw} value={fw}>
                  {FRAMEWORK_NAMES[fw] || fw}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(z - 0.2, 0.3))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setZoom(1); refetch(); }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 z-10 bg-background/90 rounded-md p-2 text-xs space-y-1 shadow-sm border">
          <p className="font-semibold mb-1">Legend</p>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#1e293b]" />
            <span>Framework</span>
          </div>
          {Object.entries(FRAMEWORK_COLORS).map(([fw, color]) => (
            <div key={fw} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span>{FRAMEWORK_NAMES[fw] || fw}</span>
            </div>
          ))}
        </div>

        {/* Node count badge */}
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="outline" className="text-xs">
            {filteredData.nodes.length} nodes · {filteredData.edges.length} edges
          </Badge>
        </div>

        {/* SVG Graph */}
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="overflow-visible"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Edges */}
          {filteredData.edges.map((edge, i) => {
            const sourcePos = positions.get(edge.source);
            const targetPos = positions.get(edge.target);
            if (!sourcePos || !targetPos) return null;

            return (
              <g key={`edge-${i}`}>
                <line
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke="#94a3b8"
                  strokeWidth={getEdgeWidth(edge)}
                  strokeOpacity={0.5}
                  markerEnd="url(#arrowhead)"
                  className="transition-all duration-300"
                />
                {/* Edge label on hover */}
                <title>{`${edge.type}: ${edge.label}`}</title>
              </g>
            );
          })}

          {/* Nodes */}
          {filteredData.nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const radius = getNodeRadius(node);
            const color = getNodeColor(node);
            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredNode?.id === node.id;
            const strokeWidth = isSelected ? 3 : isHovered ? 2 : 1;

            return (
              <g
                key={node.id}
                className="cursor-pointer transition-opacity duration-200"
                onClick={() => handleNodeClick(node)}
                onMouseMove={(e) => handleMouseMove(e, node)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Outer glow for selected */}
                {isSelected && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={radius + 4}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeOpacity={0.4}
                  />
                )}

                {/* Node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill={color}
                  fillOpacity={node.type === 'framework' ? 1 : 0.85}
                  stroke="white"
                  strokeWidth={strokeWidth}
                  className="transition-all duration-200"
                />

                {/* Node label */}
                {node.type === 'framework' ? (
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fill="white"
                    fontSize={9}
                    fontWeight={600}
                    className="select-none pointer-events-none"
                  >
                    {node.label.substring(0, 6)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredNode && (
          <div
            className="absolute z-20 bg-background border rounded-md shadow-lg px-3 py-2 text-xs space-y-1 pointer-events-none"
            style={{
              left: tooltipPos.x + 12,
              top: tooltipPos.y - 10,
              transform: 'translateY(-100%)',
            }}
          >
            <p className="font-semibold text-sm">{hoveredNode.label}</p>
            <p>Type: <Badge variant="outline" className="text-[10px] px-1 py-0">{hoveredNode.type}</Badge></p>
            <p>Framework: {FRAMEWORK_NAMES[hoveredNode.framework] || hoveredNode.framework}</p>
            {hoveredNode.status && <p>Status: {hoveredNode.status}</p>}
          </div>
        )}

        {/* Selected node detail panel */}
        {selectedNode && (
          <div className="absolute bottom-2 right-2 z-20 bg-background border rounded-md shadow-lg p-3 text-xs max-w-[220px] space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm truncate">{selectedNode.label}</p>
              <button
                className="text-muted-foreground hover:text-foreground ml-2"
                onClick={() => setSelectedNode(null)}
              >
                &times;
              </button>
            </div>
            <div className="space-y-1">
              <p>ID: <span className="text-muted-foreground">{selectedNode.id}</span></p>
              <p>Type: <Badge variant="outline" className="text-[10px] px-1 py-0">{selectedNode.type}</Badge></p>
              <p>
                Framework:{' '}
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: getNodeColor(selectedNode) }}
                />
                {FRAMEWORK_NAMES[selectedNode.framework] || selectedNode.framework}
              </p>
              {selectedNode.status && <p>Status: {selectedNode.status}</p>}
            </div>
            {/* Connected edges count */}
            <p className="text-muted-foreground">
              {filteredData.edges.filter(
                (e: MeshEdge) => e.source === selectedNode.id || e.target === selectedNode.id
              ).length}{' '}
              connection{filteredData.edges.filter((e: MeshEdge) => e.source === selectedNode.id || e.target === selectedNode.id).length !== 1 ? 's' : ''}
            </p>

            <Button variant="outline" size="sm" className="w-full text-[10px] h-7" onClick={() => {}}>
              <Share2 className="w-3 h-3 mr-1" /> View Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
