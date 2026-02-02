import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [nodes, setNodes] = useState([
    { id: 'start', type: 'start', label: 'Start', x: 600, y: 100, children: [] }
  ]);

  const [history, setHistory] = useState([JSON.stringify([
    { id: 'start', type: 'start', label: 'Start', x: 600, y: 100, children: [] }
  ])]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [nextId, setNextId] = useState(1);
  const [draggingId, setDraggingId] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(null);
  const [notification, setNotification] = useState(null);

  const MAX_HISTORY = 50;

  const saveToHistory = (newNodes) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.stringify(newNodes));
    
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const prevState = JSON.parse(history[historyIndex - 1]);
    setNodes(prevState);
    setHistoryIndex(historyIndex - 1);
    showNotification('Undo');
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextState = JSON.parse(history[historyIndex + 1]);
    setNodes(nextState);
    setHistoryIndex(historyIndex + 1);
    showNotification('Redo');
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 1500);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && !editingId) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
      
      if (e.key === 'Escape') {
        setEditingId(null);
        setShowAddMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, editingId]);

  const getNode = id => nodes.find(n => n.id === id);

  const updateNodePosition = (id, x, y) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  };

  const updateNodeLabel = (id, label) => {
    setNodes(prev => {
      const newNodes = prev.map(n => n.id === id ? { ...n, label } : n);
      saveToHistory(newNodes);
      return newNodes;
    });
  };

  const addNode = (parentId, type, branchSide = null) => {
    const parent = getNode(parentId);
    if (!parent || parent.type === 'end') return;

    const newId = `n${nextId}`;
    setNextId(p => p + 1);

    let offsetX = 0;
    let offsetY = 180;

    if (parent.type === 'branch') {
      if (branchSide === 'true') {
        offsetX = -250;
      } else if (branchSide === 'false') {
        offsetX = 250;
      }
    }

    const newNode = {
      id: newId,
      type,
      label: type === 'branch' ? 'If Condition' : type === 'end' ? 'End' : 'New Action',
      x: parent.x + offsetX,
      y: parent.y + offsetY,
      children: []
    };

    setNodes(prev => {
      const updated = prev.map(n => {
        if (n.id !== parentId) return n;

        let children = [...n.children];

        if (n.type === 'branch') {
          if (branchSide === 'true') {
            if (children[0]) newNode.children = [children[0]];
            children[0] = newId;
          } else {
            if (children[1]) newNode.children = [children[1]];
            children[1] = newId;
          }
        } else {
          if (children.length > 0) newNode.children = [...children];
          children = [newId];
        }

        return { ...n, children };
      });

      const newState = [...updated, newNode];
      saveToHistory(newState);
      return newState;
    });

    setShowAddMenu(null);
    showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} node added`);
  };

  const deleteNode = id => {
    if (id === 'start') {
      showNotification('Cannot delete Start node');
      return;
    }

    setNodes(prev => {
      let parentId = null;
      let childIndex = -1;

      for (const n of prev) {
        const i = n.children.indexOf(id);
        if (i !== -1) {
          parentId = n.id;
          childIndex = i;
          break;
        }
      }

      if (!parentId) {
        const newState = prev.filter(n => n.id !== id);
        saveToHistory(newState);
        showNotification('Node deleted');
        return newState;
      }

      const deleted = getNode(id);
      const newState = prev.map(n => {
        if (n.id === parentId) {
          const newChildren = [...n.children];
          newChildren.splice(childIndex, 1, ...deleted.children);
          return { ...n, children: newChildren };
        }
        return n;
      }).filter(n => n.id !== id);

      saveToHistory(newState);
      showNotification('Node deleted');
      return newState;
    });
  };

  const startDrag = (e, id) => {
    if (editingId) return;
    e.stopPropagation();
    const node = getNode(id);
    if (!node) return;
    setDraggingId(id);
    setOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
  };

  const handleDrag = e => {
    if (!draggingId) return;
    updateNodePosition(draggingId, e.clientX - offset.x, e.clientY - offset.y);
  };

  const stopDrag = () => {
    if (draggingId) {
      const currentNodes = nodes;
      saveToHistory(currentNodes);
      setDraggingId(null);
    }
  };

  const startEdit = (id) => {
    const node = getNode(id);
    if (!node) return;
    setEditingId(id);
    setEditValue(node.label);
  };

  const saveEdit = () => {
    if (editingId && editValue.trim()) {
      updateNodeLabel(editingId, editValue.trim());
      showNotification('Label updated');
    }
    setEditingId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveWorkflow = () => {
    const data = JSON.stringify(nodes, null, 2);
    console.log('=== WORKFLOW JSON ===');
    console.log(data);
    console.log('====================');
    localStorage.setItem('workflow', data);
    showNotification('Workflow saved!');
  };

  const loadWorkflow = () => {
    try {
      const saved = localStorage.getItem('workflow');
      if (saved) {
        const loadedNodes = JSON.parse(saved);
        setNodes(loadedNodes);
        saveToHistory(loadedNodes);
        showNotification('Workflow loaded!');
      } else {
        showNotification('No saved workflow found');
      }
    } catch (error) {
      showNotification('Error loading workflow');
      console.error('Load error:', error);
    }
  };

  const executeWorkflow = () => {
    showNotification('Executing workflow...');
    console.log('=== WORKFLOW EXECUTION ===');
    console.log('Starting execution from node:', nodes[0]);
    
    const executeNode = (nodeId, depth = 0) => {
      const node = getNode(nodeId);
      if (!node) return;
      
      const indent = '  '.repeat(depth);
      console.log(`${indent}[${node.type.toUpperCase()}] ${node.label}`);
      
      if (node.type === 'end') {
        console.log(`${indent}✓ Reached end node`);
        return;
      }
      
      if (node.type === 'branch') {
        console.log(`${indent}├─ TRUE branch:`);
        if (node.children[0]) executeNode(node.children[0], depth + 1);
        console.log(`${indent}└─ FALSE branch:`);
        if (node.children[1]) executeNode(node.children[1], depth + 1);
      } else {
        node.children.forEach(childId => executeNode(childId, depth + 1));
      }
    };
    
    executeNode('start');
    console.log('=== EXECUTION COMPLETE ===');
  };

  const toggleAddMenu = (nodeId, branchSide = null) => {
    if (showAddMenu?.nodeId === nodeId && showAddMenu?.branchSide === branchSide) {
      setShowAddMenu(null);
    } else {
      setShowAddMenu({ nodeId, branchSide });
    }
  };

  const edges = [];
  nodes.forEach(n => {
    n.children.forEach((childId, index) => {
      if (childId) {
        edges.push({ 
          from: n.id, 
          to: childId,
          branchType: n.type === 'branch' ? (index === 0 ? 'true' : 'false') : null
        });
      }
    });
  });

  const getNodeTypeInfo = (type) => {
    switch (type) {
      case 'start':
        return { icon: '▶', color: '#10b981' };
      case 'action':
        return { icon: '⚡', color: '#3b82f6' };
      case 'branch':
        return { icon: '◇', color: '#f59e0b' };
      case 'end':
        return { icon: '⬛', color: '#ef4444' };
      default:
        return { icon: '●', color: '#6b7280' };
    }
  };

  return (
    <div className="app" onPointerMove={handleDrag} onPointerUp={stopDrag} onPointerLeave={stopDrag}>
      <div className="header">
        <div className="left">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <h1>Workflow Builder</h1>
          </div>
          <div className="stats">
            <div className="stat-item">
              <span className="stat-label">Nodes</span>
              <span className="stat-value">{nodes.length}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-label">Actions</span>
              <span className="stat-value">{nodes.filter(n => n.type === 'action').length}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-label">Branches</span>
              <span className="stat-value">{nodes.filter(n => n.type === 'branch').length}</span>
            </div>
          </div>
        </div>
        
        <div className="right">
          <div className="button-group">
            <button 
              className="header-btn undo-btn" 
              onClick={undo}
              disabled={historyIndex <= 0}
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button 
              className="header-btn redo-btn" 
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Y)"
            >
              ↷
            </button>
          </div>
          <button className="header-btn load-btn" onClick={loadWorkflow}>
            Load
          </button>
          <button className="header-btn save-btn" onClick={saveWorkflow}>
            Save
          </button>
          <button className="header-btn execute-btn" onClick={executeWorkflow}>
            Execute
          </button>
        </div>
      </div>

      {notification && (
        <div className="notification">
          {notification}
        </div>
      )}

      <div className="canvas">
        <svg className="connections">
          {edges.map((edge, i) => {
            const from = getNode(edge.from);
            const to = getNode(edge.to);
            if (!from || !to) return null;

            const x1 = from.x;
            const y1 = from.y + 60;
            const x2 = to.x;
            const y2 = to.y;

            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2 + Math.abs(y2 - y1) * 0.3;

            const isTrueBranch = edge.branchType === 'true';
            const isFalseBranch = edge.branchType === 'false';
            const strokeColor = isTrueBranch ? '#10b981' : isFalseBranch ? '#ef4444' : '#475569';

            return (
              <g key={i}>
                <path
                  d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  fill="none"
                  className="connection-path"
                  markerEnd={`url(#arrow-${edge.branchType || 'default'})`}
                />
                {edge.branchType && (
                  <text
                    x={(x1 + mx) / 2}
                    y={(y1 + my) / 2}
                    className="branch-label"
                    fill={strokeColor}
                  >
                    {edge.branchType === 'true' ? 'TRUE' : 'FALSE'}
                  </text>
                )}
              </g>
            );
          })}
          <defs>
            <marker id="arrow-true" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#10b981" />
            </marker>
            <marker id="arrow-false" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#ef4444" />
            </marker>
            <marker id="arrow-default" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#475569" />
            </marker>
          </defs>
        </svg>

        {nodes.map(node => {
          const typeInfo = getNodeTypeInfo(node.type);
          const isEditing = editingId === node.id;
          const isDragging = draggingId === node.id;

          return (
            <div
              key={node.id}
              className={`node node-${node.type} ${isDragging ? 'dragging' : ''}`}
              style={{ 
                left: `${node.x}px`, 
                top: `${node.y}px`,
              }}
              onPointerDown={e => !isEditing && startDrag(e, node.id)}
            >
              <div className="node-header">
                <span className="node-icon" style={{ color: typeInfo.color }}>
                  {typeInfo.icon}
                </span>
                <span className="node-type">{node.type}</span>
                {node.id !== 'start' && (
                  <button 
                    className="delete-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(node.id);
                    }}
                    title="Delete node"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="node-body">
                {isEditing ? (
                  <div className="edit-container" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      className="edit-input"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      onPointerDown={e => e.stopPropagation()}
                    />
                    <div className="edit-actions">
                      <button className="edit-btn save" onClick={saveEdit}>✓</button>
                      <button className="edit-btn cancel" onClick={cancelEdit}>×</button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="node-label" 
                    onDoubleClick={() => startEdit(node.id)}
                    title="Double-click to edit"
                  >
                    {node.label}
                  </div>
                )}
              </div>

              {node.type !== 'end' && (
                <div className="node-footer">
                  {node.type === 'branch' ? (
                    <div className="branch-controls">
                      <button 
                        className="add-branch-btn true-branch"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAddMenu(node.id, 'true');
                        }}
                      >
                        + True
                      </button>
                      <button 
                        className="add-branch-btn false-branch"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAddMenu(node.id, 'false');
                        }}
                      >
                        + False
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="add-node-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAddMenu(node.id);
                      }}
                    >
                      + Add Node
                    </button>
                  )}

                  {showAddMenu?.nodeId === node.id && (
                    <div 
                      className="add-menu"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="add-menu-header">Add Node</div>
                      <button 
                        className="add-menu-item action"
                        onClick={() => addNode(node.id, 'action', showAddMenu.branchSide)}
                      >
                        <span className="menu-icon">⚡</span>
                        <span>Action</span>
                      </button>
                      <button 
                        className="add-menu-item branch"
                        onClick={() => addNode(node.id, 'branch', showAddMenu.branchSide)}
                      >
                        <span className="menu-icon">◇</span>
                        <span>Branch</span>
                      </button>
                      <button 
                        className="add-menu-item end"
                        onClick={() => addNode(node.id, 'end', showAddMenu.branchSide)}
                      >
                        <span className="menu-icon">⬛</span>
                        <span>End</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="keyboard-shortcuts">
        <div className="shortcut-item">
          <kbd>Ctrl</kbd> + <kbd>Z</kbd> Undo
        </div>
        <div className="shortcut-item">
          <kbd>Ctrl</kbd> + <kbd>Y</kbd> Redo
        </div>
        <div className="shortcut-item">
          <kbd>Double Click</kbd> Edit Label
        </div>
      </div>
    </div>
  );
}

export default App;