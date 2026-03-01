'use client';

import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface SidechatPost {
  id: string;
  content: string;
  like_count: number;
  topic: string;
}

interface ClusterMapProps {
  posts: SidechatPost[];
  width?: number;
  height?: number;
}

export default function ClusterMap({ posts, width = 600, height = 500 }: ClusterMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [selected, setSelected] = useState<SidechatPost | null>(null);

  // Initialize nodes with random positions
  useEffect(() => {
    const initialNodes = posts.map((post) => ({
      ...post,
      x: Math.random() * width,
      y: Math.random() * height,
      r: 10 + post.like_count * 0.5,
    }));
    setNodes(initialNodes);
  }, [posts, width, height]);

  // Run force simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const simulation = d3
      .forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-50))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.r + 5))
      .on('tick', () => {
        setNodes([...nodes]); // update state to re-render
      });

    // cleanup should not return the result of stop (which returns the simulation)
    return () => {
      simulation.stop();
    };
  }, [nodes, width, height]);

  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  return (
    <div className="relative">
      <svg ref={svgRef} width={width} height={height} className="bg-gray-50 rounded-xl shadow-md">
        {nodes.map((node) => (
          <circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            r={node.r}
            fill={colorScale(node.topic)}
            stroke="#00000022"
            strokeWidth={1}
            className="cursor-pointer transition-transform hover:scale-125"
            onClick={() => setSelected(node)}
          />
        ))}
      </svg>

      {/* Modal for selected post */}
      {selected && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/40 z-10">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
            <p className="text-gray-800 mb-4">{selected.content}</p>
            <p className="text-sm text-gray-500">Likes: {selected.like_count}</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}