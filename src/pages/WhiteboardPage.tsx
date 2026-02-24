import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box, Typography, Select, MenuItem, FormControl, Tooltip, CircularProgress,
  ToggleButtonGroup, ToggleButton, Button, IconButton, Chip, Paper, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, alpha,
  Menu, ListItemIcon, ListItemText, Divider,
} from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Tldraw, Editor, getSnapshot, loadSnapshot } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';

import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkspace } from '../contexts/WorkspaceContext';
import { toast } from 'sonner';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import DrawIcon from '@mui/icons-material/Draw';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import RectangleOutlinedIcon from '@mui/icons-material/RectangleOutlined';
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined';
import DiamondOutlinedIcon from '@mui/icons-material/DiamondOutlined';
import StorageIcon from '@mui/icons-material/Storage';
import WebIcon from '@mui/icons-material/Web';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

import api from '../services/apiClient';
import { addTaskToDB } from '../services/taskService';
import { useAuth } from '../contexts/AuthContext';

/* ──────────────────────────────────────── */
/*  Custom Node Components for ReactFlow    */
/* ──────────────────────────────────────── */

interface DiagramNodeData {
  label: string;
  color: string;
  icon?: string;
  description?: string;
  [key: string]: unknown;
}

function ProcessNode({ data }: { data: DiagramNodeData }) {
  return (
    <Box sx={{
      px: 2.5, py: 1.5, borderRadius: 2, bgcolor: data.color || '#3b82f6',
      color: '#fff', minWidth: 140, textAlign: 'center',
      boxShadow: '0 4px 14px rgba(0,0,0,0.15)', border: '2px solid rgba(255,255,255,0.2)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#fff' }} />
      <Typography variant="body2" fontWeight={700}>{data.label}</Typography>
      {data.description && (
        <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', mt: 0.3 }}>{data.description}</Typography>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#fff' }} />
    </Box>
  );
}

function DecisionNode({ data }: { data: DiagramNodeData }) {
  return (
    <Box sx={{
      width: 120, height: 120, transform: 'rotate(45deg)',
      bgcolor: data.color || '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 14px rgba(0,0,0,0.15)', border: '2px solid rgba(255,255,255,0.3)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#fff', transform: 'rotate(-45deg)' }} />
      <Typography variant="caption" fontWeight={700} sx={{ transform: 'rotate(-45deg)', color: '#fff', textAlign: 'center', px: 1 }}>
        {data.label}
      </Typography>
      <Handle type="source" position={Position.Bottom} style={{ background: '#fff', transform: 'rotate(-45deg)' }} />
    </Box>
  );
}

function DatabaseNode({ data }: { data: DiagramNodeData }) {
  return (
    <Box sx={{
      px: 2.5, py: 1.5, borderRadius: '12px 12px 50% 50%', bgcolor: data.color || '#8b5cf6',
      color: '#fff', minWidth: 130, textAlign: 'center',
      boxShadow: '0 4px 14px rgba(0,0,0,0.15)', border: '2px solid rgba(255,255,255,0.2)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#fff' }} />
      <StorageIcon sx={{ fontSize: 18, mb: 0.3 }} />
      <Typography variant="body2" fontWeight={700}>{data.label}</Typography>
      {data.description && (
        <Typography variant="caption" sx={{ opacity: 0.85, display: 'block' }}>{data.description}</Typography>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#fff' }} />
    </Box>
  );
}

function ServiceNode({ data }: { data: DiagramNodeData }) {
  const iconMap: Record<string, React.ReactNode> = {
    web: <WebIcon sx={{ fontSize: 18, mb: 0.3 }} />,
    cloud: <CloudQueueIcon sx={{ fontSize: 18, mb: 0.3 }} />,
    user: <PersonOutlineIcon sx={{ fontSize: 18, mb: 0.3 }} />,
  };
  return (
    <Box sx={{
      px: 2.5, py: 1.5, borderRadius: 3, bgcolor: data.color || '#10b981',
      color: '#fff', minWidth: 140, textAlign: 'center',
      boxShadow: '0 4px 14px rgba(0,0,0,0.15)', border: '2px solid rgba(255,255,255,0.2)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#fff' }} />
      <Handle type="target" position={Position.Left} id="left" style={{ background: '#fff' }} />
      {data.icon && iconMap[data.icon]}
      <Typography variant="body2" fontWeight={700}>{data.label}</Typography>
      {data.description && (
        <Typography variant="caption" sx={{ opacity: 0.85, display: 'block' }}>{data.description}</Typography>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#fff' }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: '#fff' }} />
    </Box>
  );
}

function GroupNode({ data }: { data: DiagramNodeData }) {
  return (
    <Box sx={{
      px: 3, py: 2, borderRadius: 3,
      bgcolor: alpha(data.color || '#6366f1', 0.08),
      border: `2px dashed ${data.color || '#6366f1'}`,
      minWidth: 200, minHeight: 100,
    }}>
      <Typography variant="caption" fontWeight={700} color={data.color || '#6366f1'}>
        {data.label}
      </Typography>
      {data.description && (
        <Typography variant="caption" sx={{ opacity: 0.6, display: 'block' }}>{data.description}</Typography>
      )}
    </Box>
  );
}

const nodeTypes: NodeTypes = {
  process: ProcessNode,
  decision: DecisionNode,
  database: DatabaseNode,
  service: ServiceNode,
  group: GroupNode,
};

/* ──────────────────────────────── */
/*  Shape Palette Items             */
/* ──────────────────────────────── */
const shapeOptions = [
  { type: 'process', label: 'Process', icon: <RectangleOutlinedIcon fontSize="small" />, color: '#3b82f6' },
  { type: 'decision', label: 'Decision', icon: <DiamondOutlinedIcon fontSize="small" />, color: '#f59e0b' },
  { type: 'database', label: 'Database', icon: <StorageIcon fontSize="small" />, color: '#8b5cf6' },
  { type: 'service', label: 'Service', icon: <WebIcon fontSize="small" />, color: '#10b981' },
  { type: 'group', label: 'Group', icon: <CircleOutlinedIcon fontSize="small" />, color: '#6366f1' },
];

const templateDiagrams: Record<string, { nodes: Node[]; edges: Edge[] }> = {
  flowchart: {
    nodes: [
      { id: '1', type: 'process', position: { x: 250, y: 0 }, data: { label: 'Start', color: '#10b981', description: '' } },
      { id: '2', type: 'process', position: { x: 250, y: 120 }, data: { label: 'Process A', color: '#3b82f6', description: 'Main logic' } },
      { id: '3', type: 'decision', position: { x: 230, y: 260 }, data: { label: 'Condition?', color: '#f59e0b', description: '' } },
      { id: '4', type: 'process', position: { x: 80, y: 420 }, data: { label: 'Path A', color: '#3b82f6', description: '' } },
      { id: '5', type: 'process', position: { x: 420, y: 420 }, data: { label: 'Path B', color: '#3b82f6', description: '' } },
      { id: '6', type: 'process', position: { x: 250, y: 560 }, data: { label: 'End', color: '#ef4444', description: '' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-3', source: '2', target: '3', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3-4', source: '3', target: '4', label: 'Yes', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3-5', source: '3', target: '5', label: 'No', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e4-6', source: '4', target: '6', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e5-6', source: '5', target: '6', markerEnd: { type: MarkerType.ArrowClosed } },
    ],
  },
  architecture: {
    nodes: [
      { id: '1', type: 'service', position: { x: 250, y: 0 }, data: { label: 'Client App', color: '#3b82f6', icon: 'web', description: 'React / Mobile' } },
      { id: '2', type: 'service', position: { x: 250, y: 150 }, data: { label: 'API Gateway', color: '#10b981', icon: 'cloud', description: 'Nginx / Kong' } },
      { id: '3', type: 'service', position: { x: 80, y: 310 }, data: { label: 'Auth Service', color: '#f59e0b', icon: 'user', description: 'JWT / OAuth' } },
      { id: '4', type: 'service', position: { x: 420, y: 310 }, data: { label: 'Task Service', color: '#8b5cf6', icon: 'web', description: 'Django REST' } },
      { id: '5', type: 'database', position: { x: 80, y: 470 }, data: { label: 'User DB', color: '#ef4444', description: 'PostgreSQL' } },
      { id: '6', type: 'database', position: { x: 420, y: 470 }, data: { label: 'Task DB', color: '#ef4444', description: 'PostgreSQL' } },
      { id: '7', type: 'service', position: { x: 250, y: 470 }, data: { label: 'Message Queue', color: '#14b8a6', icon: 'cloud', description: 'Redis / RabbitMQ' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, label: 'HTTPS', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-3', source: '2', target: '3', label: 'Auth', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-4', source: '2', target: '4', label: 'API', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3-5', source: '3', target: '5', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e4-6', source: '4', target: '6', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e4-7', source: '4', target: '7', style: { strokeDasharray: '5 5' }, label: 'Events', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3-7', source: '3', target: '7', style: { strokeDasharray: '5 5' }, markerEnd: { type: MarkerType.ArrowClosed } },
    ],
  },
  mindmap: {
    nodes: [
      { id: '1', type: 'process', position: { x: 300, y: 200 }, data: { label: 'Main Idea', color: '#6366f1', description: 'Central topic' } },
      { id: '2', type: 'service', position: { x: 80, y: 50 }, data: { label: 'Branch 1', color: '#3b82f6', icon: 'web', description: '' } },
      { id: '3', type: 'service', position: { x: 530, y: 50 }, data: { label: 'Branch 2', color: '#10b981', icon: 'cloud', description: '' } },
      { id: '4', type: 'service', position: { x: 80, y: 360 }, data: { label: 'Branch 3', color: '#f59e0b', icon: 'user', description: '' } },
      { id: '5', type: 'service', position: { x: 530, y: 360 }, data: { label: 'Branch 4', color: '#ef4444', icon: 'web', description: '' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e1-3', source: '1', target: '3', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e1-4', source: '1', target: '4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e1-5', source: '1', target: '5', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
    ],
  },
};

/* ──────────────────────────────── */
/*  Main Component                  */
/* ──────────────────────────────── */

export default function WhiteboardPage() {
  const { projects, currentProject, setCurrentProject } = useWorkspace();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saved'>('idle');
  const [mode, setMode] = useState<'freeform' | 'diagram'>('diagram');

  // ──── Context Menu (right-click) state ────
  const [ctxMenu, setCtxMenu] = useState<{ mouseX: number; mouseY: number; nodeId: string } | null>(null);
  const [convertedNodeIds, setConvertedNodeIds] = useState<Set<string>>(new Set());

  // ──── Freeform (tldraw) state ────
  const [editor, setEditor] = useState<Editor | null>(null);

  // ──── Diagram (ReactFlow) state ────
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [editNode, setEditNode] = useState<Node | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState('#3b82f6');
  const nodeCounter = useRef(100);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({
      ...params,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2 },
    }, eds));
  }, [setEdges]);

  const addNode = useCallback((shapeType: string, color: string) => {
    const id = `node_${++nodeCounter.current}`;
    const newNode: Node = {
      id,
      type: shapeType,
      position: { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: { label: `New ${shapeType}`, color, description: '', icon: shapeType === 'service' ? 'web' : undefined },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const loadTemplate = useCallback((key: string) => {
    const tmpl = templateDiagrams[key];
    if (tmpl) {
      setNodes(tmpl.nodes);
      setEdges(tmpl.edges);
      toast.success(`Loaded "${key}" template`);
    }
  }, [setNodes, setEdges]);

  const handleNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setEditNode(node);
    setEditLabel((node.data as DiagramNodeData).label);
    setEditDesc((node.data as DiagramNodeData).description || '');
    setEditColor((node.data as DiagramNodeData).color || '#3b82f6');
  }, []);

  const saveNodeEdit = useCallback(() => {
    if (!editNode) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === editNode.id
          ? { ...n, data: { ...n.data, label: editLabel, description: editDesc, color: editColor } }
          : n
      )
    );
    setEditNode(null);
  }, [editNode, editLabel, editDesc, editColor, setNodes]);

  const deleteSelectedNodes = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, [setNodes, setEdges]);

  // ──── Context Menu Handlers ────
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setCtxMenu({ mouseX: event.clientX, mouseY: event.clientY, nodeId: node.id });
  }, []);

  const handleCloseCtxMenu = useCallback(() => setCtxMenu(null), []);

  const handleConvertToTask = useCallback(async () => {
    if (!ctxMenu || !currentProject || !user) {
      toast.error('Please select a project first.');
      handleCloseCtxMenu();
      return;
    }
    const targetNode = nodes.find(n => n.id === ctxMenu.nodeId);
    if (!targetNode) { handleCloseCtxMenu(); return; }

    const nodeData = targetNode.data as DiagramNodeData;
    try {
      await addTaskToDB(
        nodeData.label || 'Untitled Task',
        user.uid,
        undefined,
        ['whiteboard'],
        {
          description: nodeData.description ? `[From Whiteboard] ${nodeData.description}` : '[Created from Whiteboard diagram node]',
          projectId: currentProject.id,
          workspaceId: currentProject.workspaceId,
          status: 'todo',
          scope: 'work',
        }
      );
      setConvertedNodeIds(prev => new Set(prev).add(ctxMenu.nodeId));
      // Visual feedback: update node border
      setNodes(nds => nds.map(n =>
        n.id === ctxMenu.nodeId
          ? { ...n, style: { ...n.style, outline: '3px solid #10b981', outlineOffset: '2px' } }
          : n
      ));
      toast.success(`✅ Task "${nodeData.label}" created!`);
    } catch (err) {
      console.error('Failed to convert node to task:', err);
      toast.error('Failed to create task.');
    }
    handleCloseCtxMenu();
  }, [ctxMenu, currentProject, user, nodes, setNodes, handleCloseCtxMenu]);

  const handleDuplicateNode = useCallback(() => {
    if (!ctxMenu) return;
    const sourceNode = nodes.find(n => n.id === ctxMenu.nodeId);
    if (!sourceNode) { handleCloseCtxMenu(); return; }
    const id = `node_${++nodeCounter.current}`;
    const newNode: Node = {
      ...sourceNode,
      id,
      position: { x: sourceNode.position.x + 40, y: sourceNode.position.y + 40 },
      selected: false,
    };
    setNodes(nds => [...nds, newNode]);
    handleCloseCtxMenu();
  }, [ctxMenu, nodes, setNodes, handleCloseCtxMenu]);

  const handleDeleteNode = useCallback(() => {
    if (!ctxMenu) return;
    setNodes(nds => nds.filter(n => n.id !== ctxMenu.nodeId));
    setEdges(eds => eds.filter(e => e.source !== ctxMenu.nodeId && e.target !== ctxMenu.nodeId));
    handleCloseCtxMenu();
  }, [ctxMenu, setNodes, setEdges, handleCloseCtxMenu]);

  // ──── Load & Save ────
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveToCloud = useCallback(async (payload: unknown) => {
    if (!currentProject?.id) return;
    setSyncStatus('syncing');
    try {
      await api.patch(`projects/${currentProject.id}/`, { whiteboardData: payload });
      setSyncStatus('saved');
    } catch (err) {
      console.error('Failed to save whiteboard to cloud:', err);
    }
  }, [currentProject?.id]);

  // Load on project change
  useEffect(() => {
    if (!currentProject) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await api.get<{ whiteboardData?: Record<string, unknown> }>(`projects/${currentProject.id}/`);
        const wb = data.whiteboardData as Record<string, unknown> | undefined;

        if (wb && Object.keys(wb).length > 0) {
          // Diagram data
          const diagramData = wb.diagram as { nodes?: Node[]; edges?: Edge[] } | undefined;
          if (diagramData) {
            setNodes(diagramData.nodes || []);
            setEdges(diagramData.edges || []);
          }
          // Tldraw data
          if (wb.freeform && editor) {
            loadSnapshot(editor.store, wb.freeform);
          }
        } else {
          setNodes([]);
          setEdges([]);
        }
        setSyncStatus('saved');
      } catch (err) {
        console.error('Failed to load whiteboard data:', err);
        toast.error('Failed to load whiteboard data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

  // Auto-save diagram changes (debounced)
  useEffect(() => {
    if (mode !== 'diagram' || !currentProject) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveToCloud({ diagram: { nodes, edges } });
    }, 3000);
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // Tldraw mount handler
  const handleTldrawMount = useCallback((ed: Editor) => {
    setEditor(ed);
    ed.store.listen(
      () => {
        if (!currentProject) return;
        setSyncStatus('syncing');
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
          const snapshot = getSnapshot(ed.store);
          saveToCloud({ freeform: snapshot });
        }, 3000);
      },
      { scope: 'document', source: 'user' }
    );
  }, [currentProject, saveToCloud]);

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ─── Top Bar ─── */}
      <Box sx={{
        px: 2.5, py: 1.5, borderBottom: '1px solid #e2e8f0', bgcolor: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2,
        flexWrap: 'wrap',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" fontWeight={700}>
            Whiteboard
          </Typography>
          <Tooltip title={syncStatus === 'syncing' ? 'Saving…' : 'Saved'}>
            {syncStatus === 'syncing'
              ? <CloudSyncIcon color="primary" sx={{ animation: 'spin 2s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
              : <CloudDoneIcon color="success" />}
          </Tooltip>
        </Box>

        <ToggleButtonGroup
          exclusive size="small" value={mode}
          onChange={(_, v) => v && setMode(v)}
          sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, gap: 0.5 } }}
        >
          <ToggleButton value="diagram"><AccountTreeIcon fontSize="small" /> Diagram</ToggleButton>
          <ToggleButton value="freeform"><DrawIcon fontSize="small" /> Freeform</ToggleButton>
        </ToggleButtonGroup>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            value={currentProject?.id || ''}
            onChange={(e) => {
              const p = projects.find(proj => proj.id === e.target.value);
              if (p) setCurrentProject(p);
            }}
            displayEmpty
          >
            <MenuItem value="" disabled>Select Project…</MenuItem>
            {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {/* ─── Canvas Area ─── */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        {loading && (
          <Box sx={{
            position: 'absolute', inset: 0, zIndex: 10,
            bgcolor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CircularProgress />
          </Box>
        )}

        {/* ── Diagram Mode ── */}
        {mode === 'diagram' && (
          <Box sx={{ position: 'absolute', inset: 0 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDoubleClick={handleNodeDoubleClick}
              onNodeContextMenu={handleNodeContextMenu}
              nodeTypes={memoizedNodeTypes}
              fitView
              snapToGrid
              snapGrid={[16, 16]}
              defaultEdgeOptions={{ animated: true, style: { strokeWidth: 2 } }}
              style={{ background: '#f8fafc' }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
              <Controls />
              <MiniMap
                nodeStrokeColor="#6366f1"
                nodeColor={(n) => (n.data as DiagramNodeData)?.color || '#3b82f6'}
                style={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
              />

              {/* ── Toolbar Panel ── */}
              <Panel position="top-left">
                <Paper elevation={2} sx={{ p: 1.5, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 150 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ px: 0.5 }}>
                    ADD SHAPES
                  </Typography>
                  {shapeOptions.map((s) => (
                    <Button
                      key={s.type}
                      variant="outlined"
                      size="small"
                      startIcon={s.icon}
                      sx={{
                        justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600,
                        borderColor: s.color, color: s.color,
                        '&:hover': { bgcolor: alpha(s.color, 0.08), borderColor: s.color },
                      }}
                      onClick={() => addNode(s.type, s.color)}
                    >
                      {s.label}
                    </Button>
                  ))}

                  <Box sx={{ borderTop: '1px solid #e2e8f0', pt: 1, mt: 0.5 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ px: 0.5 }}>
                      TEMPLATES
                    </Typography>
                    <Button size="small" fullWidth sx={{ justifyContent: 'flex-start', textTransform: 'none', mt: 0.5 }}
                      onClick={() => loadTemplate('flowchart')}>
                      📊 Flowchart
                    </Button>
                    <Button size="small" fullWidth sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                      onClick={() => loadTemplate('architecture')}>
                      🏗️ Architecture
                    </Button>
                    <Button size="small" fullWidth sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                      onClick={() => loadTemplate('mindmap')}>
                      🧠 Mind Map
                    </Button>
                  </Box>

                  <Box sx={{ borderTop: '1px solid #e2e8f0', pt: 1, mt: 0.5 }}>
                    <Tooltip title="Delete selected nodes (Del)">
                      <IconButton size="small" color="error" onClick={deleteSelectedNodes}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Save now">
                      <IconButton size="small" color="primary" onClick={() => saveToCloud({ diagram: { nodes, edges } })}>
                        <SaveIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              </Panel>

              {/* ── Info Panel ── */}
              <Panel position="bottom-center">
                <Chip
                  size="small" variant="outlined"
                  label={`${nodes.length} nodes · ${edges.length} edges — Double-click to edit · Drag to connect`}
                  sx={{ bgcolor: 'white', fontWeight: 500, fontSize: '0.7rem' }}
                />
              </Panel>
            </ReactFlow>
          </Box>
        )}

        {/* ── Freeform Mode ── */}
        {mode === 'freeform' && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <Tldraw onMount={handleTldrawMount} />
          </div>
        )}
      </Box>

      {/* ─── Node Edit Dialog ─── */}
      <Dialog open={!!editNode} onClose={() => setEditNode(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Node</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField label="Label" fullWidth value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
          <TextField label="Description" fullWidth multiline rows={2} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#14b8a6', '#ec4899'].map((c) => (
              <Box
                key={c}
                onClick={() => setEditColor(c)}
                sx={{
                  width: 32, height: 32, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                  border: editColor === c ? '3px solid #1e293b' : '3px solid transparent',
                  transition: 'all .15s',
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditNode(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveNodeEdit}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Right-Click Context Menu ─── */}
      <Menu
        open={ctxMenu !== null}
        onClose={handleCloseCtxMenu}
        anchorReference="anchorPosition"
        anchorPosition={ctxMenu ? { top: ctxMenu.mouseY, left: ctxMenu.mouseX } : undefined}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' } } }}
      >
        <MenuItem
          onClick={handleConvertToTask}
          disabled={!currentProject || (ctxMenu ? convertedNodeIds.has(ctxMenu.nodeId) : false)}
        >
          <ListItemIcon><AssignmentTurnedInIcon fontSize="small" sx={{ color: '#10b981' }} /></ListItemIcon>
          <ListItemText
            primary={ctxMenu && convertedNodeIds.has(ctxMenu.nodeId) ? 'Already converted' : 'Convert to Task'}
            primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }}
          />
        </MenuItem>
        <MenuItem onClick={handleDuplicateNode}>
          <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Duplicate" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }} />
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteNode}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText primary="Delete" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600, color: 'error.main' }} />
        </MenuItem>
      </Menu>
    </Box>
  );
}
