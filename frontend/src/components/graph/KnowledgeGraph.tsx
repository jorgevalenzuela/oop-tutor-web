import { useCallback, useState, useMemo } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { useKnowledgeGraph } from '@/hooks/useKnowledgeGraph'
import ConceptNode from './ConceptNode'
import ConceptDetail from './ConceptDetail'
import { Loader2 } from 'lucide-react'

const nodeTypes = {
  concept: ConceptNode,
}

// Dagre layout configuration
const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = 'TB'
) => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  const nodeWidth = 180
  const nodeHeight = 60

  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

export default function KnowledgeGraph() {
  const { data: graphData, isLoading, error } = useKnowledgeGraph()
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  // Transform API data to React Flow format
  const layoutedData = useMemo(() => {
    if (!graphData) return { nodes: [] as Node[], edges: [] as Edge[] }

    const nodes: Node[] = graphData.nodes.map((node) => ({
      id: node.id,
      type: 'concept',
      position: { x: 0, y: 0 },
      data: {
        label: node.label,
        level: node.level,
        definition: node.definition,
      },
    }))

    const edges: Edge[] = graphData.edges.map((edge, index) => ({
      id: `e-${index}-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: edge.type === 'related',
      style: {
        stroke: edge.type === 'contrasts' ? '#ef4444' : '#3b82f6',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.type === 'contrasts' ? '#ef4444' : '#3b82f6',
      },
      label: edge.type === 'contrasts' ? 'contrasts' : '',
      labelStyle: { fontSize: 10, fill: '#666' },
    }))

    return getLayoutedElements(nodes, edges)
  }, [graphData])

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedData.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedData.edges)

  // Update nodes and edges when data changes
  useMemo(() => {
    if (layoutedData.nodes.length > 0) {
      setNodes(layoutedData.nodes)
      setEdges(layoutedData.edges)
    }
  }, [layoutedData.nodes, layoutedData.edges, setNodes, setEdges])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id)
  }, [])

  const closeDetail = useCallback(() => {
    setSelectedNode(null)
  }, [])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading knowledge graph...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-red-600">
          Error loading graph: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    )
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-gray-500">No concepts found in the knowledge base.</div>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const level = node.data?.level as string
            switch (level) {
              case 'Beginner':
                return '#22c55e'
              case 'Intermediate':
                return '#f59e0b'
              case 'Advanced':
                return '#ef4444'
              default:
                return '#94a3b8'
            }
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
        />
        <Background gap={12} size={1} />
        <Panel position="top-left" className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="text-sm font-medium mb-2">Legend</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span>Beginner</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500"></div>
              <span>Intermediate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span>Advanced</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-6 h-0.5 bg-blue-500"></div>
              <span>Related</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-red-500"></div>
              <span>Contrasts</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {selectedNode && (
        <ConceptDetail topic={selectedNode} onClose={closeDetail} />
      )}
    </div>
  )
}
