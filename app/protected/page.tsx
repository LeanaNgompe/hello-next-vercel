'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { supabase } from '@/lib/supabase/client';
import { FiX, FiHeart, FiClock } from 'react-icons/fi';

// Types
interface SidechatPost extends d3.SimulationNodeDatum {
  id: string;
  content: string;
  like_count: number;
  created_datetime_utc: string;
  topic?: string;
}

const TOPICS = ['Campus Life', 'Memes', 'Confessions', 'Academic', 'Social', 'Rants'];

export default function SidechatClusterMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [posts, setPosts] = useState<SidechatPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<SidechatPost | null>(null);
  const [loading, setLoading] = useState(true);

  // crude topic classifier using keywords; return one of TOPICS
  function classifyTopic(content: string): string {
    const lower = content.toLowerCase();
    if (/\b(meme|lol|funny|haha)\b/.test(lower)) return 'Memes';
    if (/\b(confess|confession|sorry|regret)\b/.test(lower)) return 'Confessions';
    if (/\b(class|exam|homework|professor|grade)\b/.test(lower)) return 'Academic';
    if (/\b(ghost|date|party|friend|crowd)\b/.test(lower)) return 'Social';
    if (/\b(rant|ranting|ugh|hate|annoy)\b/.test(lower)) return 'Rants';
    if (/\b(dorm|campus|library|food|club|lecture)\b/.test(lower)) return 'Campus Life';
    // fallback random
    return TOPICS[Math.floor(Math.random() * TOPICS.length)];
  }

  // Fetch Data
  useEffect(() => {
    async function fetchPopularPosts() {
      setLoading(true);
      const { data, error } = await supabase
        .from('sidechat_posts')
        .select('id, content, like_count, created_datetime_utc')
        .order('like_count', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching sidechat posts:', error);
      } else if (data) {
        // apply classification for shading
        const processedData: SidechatPost[] = data.map((post) => ({
          ...post,
          topic: classifyTopic(post.content),
        }));
        setPosts(processedData);
      }
      setLoading(false);
    }

    fetchPopularPosts();
  }, []);

  // D3 Force Simulation
  useEffect(() => {
    if (!posts.length || !svgRef.current) return;

    const width = svgRef.current.clientWidth || 800;
    const height = 600;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Clear previous elements
    svg.selectAll('*').remove();

    // Scale for circle radius based on like_count
    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(posts, d => d.like_count) || 100])
      .range([20, 80]);

    // Color scale for topics
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
      .domain(TOPICS);

    // Simulation
    const simulation = d3.forceSimulation<SidechatPost>(posts)
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('charge', d3.forceManyBody().strength(5))
      .force('collide', d3.forceCollide<SidechatPost>(d => radiusScale(d.like_count) + 5))
      .on('tick', ticked);

    // Draw Circles
    const nodes = svg.append('g')
      .selectAll('circle')
      .data(posts)
      .enter()
      .append('circle')
      .attr('r', d => radiusScale(d.like_count))
      .attr('fill', d => colorScale(d.topic || 'Social'))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('class', 'cursor-pointer transition-all duration-300 hover:opacity-80 hover:stroke-blue-400')
      .on('click', (event, d) => setSelectedPost(d))
      .call(d3.drag<SVGCircleElement, SidechatPost>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any
      );

    // Add labels: only show when circle is large enough; keep original size and animate
    const labels = svg.append('g')
      .selectAll('text')
      .data(posts)
      .enter()
      .append('text')
      .text(d => {
        const r = radiusScale(d.like_count);
        if (r < 30) return ''; // skip tiny nodes
        const words = d.content.split(' ').slice(0, 3);
        return words.join(' ');
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('pointer-events', 'none')
      .attr('font-weight', 'bold')
      .style('transition', 'x 0.2s, y 0.2s');

    function ticked() {
      nodes
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);
      
      labels
        .attr('x', d => d.x!)
        .attr('y', d => d.y!);
    }

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [posts]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center md:text-left">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            Sidechat Feed <span className="text-blue-600">Cluster Map</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
            Visualizing the top 20 most liked posts by topic and engagement.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-[600px] bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 h-[600px]">
            <svg ref={svgRef} className="w-full h-full" />
            
            {/* Legend */}
            <div className="absolute bottom-6 left-6 flex flex-wrap gap-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg max-w-xs">
              {TOPICS.map((topic, i) => (
                <div key={topic} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: d3.schemeTableau10[i % 10] }} 
                  />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{topic}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Overlay */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black uppercase tracking-widest">
                  {selectedPost.topic}
                </div>
                <button 
                  onClick={() => setSelectedPost(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <FiX className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-8">
                "{selectedPost.content}"
              </p>

              <div className="flex items-center gap-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 text-orange-500">
                  <FiHeart className="w-5 h-5 fill-current" />
                  <span className="font-black">{selectedPost.like_count}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <FiClock className="w-5 h-5" />
                  <span className="font-bold text-sm">
                    {new Date(selectedPost.created_datetime_utc).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setSelectedPost(null)}
              className="w-full py-5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold transition-all uppercase tracking-widest text-xs"
            >
              Close Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
