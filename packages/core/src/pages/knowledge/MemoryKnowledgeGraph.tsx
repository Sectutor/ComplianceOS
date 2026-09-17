import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Search, 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  Building2, 
  Server, 
  ExternalLink,
  Layers,
  Sparkles
} from "lucide-react";

interface GraphNode {
  id: string;
  name: string;
  type: string;
  path: string;
  summary: string;
  val: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
}

export function MemoryKnowledgeGraph({ onSelectNode }: { onSelectNode?: (path: string) => void }) {
  const { data: graphData, refetch, isLoading } = (trpc as any).memory.getKnowledgeGraph.useQuery();

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initialize simulation coordinates
  useEffect(() => {
    if (graphData?.nodes && graphData.nodes.length > 0) {
      const width = 800;
      const height = 500;
      const initializedNodes: GraphNode[] = graphData.nodes.map((n: any, idx: number) => {
        const angle = (idx / graphData.nodes.length) * 2 * Math.PI;
        const radius = 120 + (idx % 3) * 60;
        return {
          ...n,
          x: width / 2 + radius * Math.cos(angle) + (Math.random() - 0.5) * 40,
          y: height / 2 + radius * Math.sin(angle) + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
        };
      });
      setNodes(initializedNodes);
      setLinks(graphData.links || []);
    }
  }, [graphData]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x + canvas.width / 2, pan.y + canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw Links
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    ctx.lineWidth = 1.5;

    for (const link of links) {
      const src = nodeMap.get(link.source);
      const tgt = nodeMap.get(link.target);
      if (src && tgt && src.x !== undefined && src.y !== undefined && tgt.x !== undefined && tgt.y !== undefined) {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.stroke();

        if (link.label && link.label !== "contains") {
          const midX = (src.x + tgt.x) / 2;
          const midY = (src.y + tgt.y) / 2;
          ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
          ctx.font = "9px sans-serif";
          ctx.fillText(link.label, midX + 3, midY - 3);
        }
      }
    }

    // Filter nodes for rendering
    const visibleNodes = nodes.filter((n) => {
      const matchType = filterType === "all" || n.type === filterType;
      const matchSearch = !searchTerm || n.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchSearch;
    });

    // Draw Nodes
    for (const n of visibleNodes) {
      if (n.x === undefined || n.y === undefined) continue;

      const isSelected = selectedNode?.id === n.id;
      const radius = n.type === "folder" ? 14 : 10;

      // Color mapping
      let color = "#3b82f6"; // default blue
      if (n.type === "policy") color = "#10b981"; // emerald
      else if (n.type === "control") color = "#06b6d4"; // cyan
      else if (n.type === "risk") color = "#f59e0b"; // amber
      else if (n.type === "vendor") color = "#8b5cf6"; // purple
      else if (n.type === "infrastructure") color = "#3b82f6"; // blue
      else if (n.type === "folder") color = "#64748b"; // slate

      // Glow if selected
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius + 6, 0, 2 * Math.PI);
        ctx.fillStyle = `${color}33`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Node label
      ctx.fillStyle = "#f8fafc";
      ctx.font = isSelected ? "bold 11px sans-serif" : "10px sans-serif";
      ctx.fillText(n.name.length > 18 ? n.name.slice(0, 16) + "..." : n.name, n.x + radius + 4, n.y + 3);
    }

    ctx.restore();
  }, [nodes, links, selectedNode, filterType, searchTerm, zoom, pan]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - pan.x - canvas.width / 2) / zoom + canvas.width / 2;
    const clickY = (e.clientY - rect.top - pan.y - canvas.height / 2) / zoom + canvas.height / 2;

    // Find clicked node
    for (const n of nodes) {
      if (n.x !== undefined && n.y !== undefined) {
        const dist = Math.hypot(n.x - clickX, n.y - clickY);
        if (dist <= 16) {
          setSelectedNode(n);
          if (onSelectNode) onSelectNode(n.path);
          return;
        }
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Knowledge Graph Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm text-foreground">Interactive Knowledge Graph</span>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
            {nodes.length} Nodes Connected
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search graph nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>

          <div className="flex items-center gap-1 border border-border rounded-md p-0.5 bg-background">
            {["all", "policy", "risk", "vendor", "control"].map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterType(type)}
                className="h-7 text-[11px] px-2 capitalize"
              >
                {type}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}>
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}>
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              <RotateCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Canvas & Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-[460px]">
        {/* Canvas Area */}
        <div className="lg:col-span-3 rounded-lg border border-border bg-slate-950 relative overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={850}
            height={500}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleCanvasClick}
          />

          {/* Legend Overlay */}
          <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-md p-2 flex items-center gap-3 text-[11px] text-slate-300">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Policy</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" /> Control</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Risk</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" /> Vendor</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Cloud</span>
          </div>
        </div>

        {/* Selected Node Details Drawer */}
        <div className="lg:col-span-1 rounded-lg border border-border bg-card p-4 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-foreground mb-1 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Node Inspector
            </h4>
            <p className="text-xs text-muted-foreground mb-4">Click any node on the graph to inspect bidirectional compliance connections.</p>

            {selectedNode ? (
              <div className="space-y-3">
                <div>
                  <Badge variant="outline" className="text-[10px] capitalize mb-1 bg-primary/5 text-primary border-primary/20">
                    {selectedNode.type}
                  </Badge>
                  <h5 className="font-semibold text-sm text-foreground">{selectedNode.name}</h5>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{selectedNode.path}</p>
                </div>

                <div className="p-2.5 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">L0 Summary:</p>
                  {selectedNode.summary || "No L0 summary documented."}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <Network className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                Select a node to inspect its compliance relationships.
              </div>
            )}
          </div>

          {selectedNode && onSelectNode && (
            <Button
              size="sm"
              onClick={() => onSelectNode(selectedNode.path)}
              className="w-full text-xs font-semibold mt-4"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Open Document
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
