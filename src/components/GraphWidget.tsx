import React, { useState } from 'react';
import { LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface SolveRecord {
  id: string;
  time: number;
  scramble: string;
  timestamp: number;
  state: 'ok' | 'plus2' | 'dnf';
  ao5?: number | null;
  ao12?: number | null;
  inspectionTime?: number;
  puzzleType?: string;
}

interface GraphWidgetProps {
  isFocused: boolean;
  theme: 'light' | 'dark';
  currentCubeType?: string;
  refreshTrigger?: number;
  sessions: any[];
  getActiveSession: () => any;
}

type PresetView = 'times-vs-time' | 'ao5-vs-time' | 'ao12-vs-time' | 'inspection-vs-time';
type CustomAxis = 'inspection-time' | 'average' | 'solve-time' | 'time';

interface CustomConfig {
  xAxis: CustomAxis;
  yAxis: CustomAxis;
}

const GraphWidget: React.FC<GraphWidgetProps> = ({ 
  isFocused, 
  theme, 
  currentCubeType = '333', 
  sessions,
  getActiveSession 
}) => {
  const [viewMode, setViewMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<PresetView>('times-vs-time');
  const [filters, setFilters] = useState<{
    currentSession: boolean;
    currentCube: boolean;
  }>({
    currentSession: true,
    currentCube: false
  });
  const [customConfig, setCustomConfig] = useState<CustomConfig>({
    xAxis: 'time',
    yAxis: 'solve-time'
  });

  // Theme variables
  const bgColor = theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(31, 31, 31, 0.95)';
  const borderColor = theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';
  const textPrimary = theme === 'light' ? '#000000' : '#ffffff';
  const textSecondary = theme === 'light' ? '#666666' : '#a3a3a3';
  const buttonBg = theme === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)';
  const buttonBorder = theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';

  // Format time for display
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    return `${seconds}.${ms.toString().padStart(2, '0')}`;
  };

  // Get filtered solve data - FRESH EVERY TIME
  const getFilteredSolves = (): SolveRecord[] => {
    let allSolves: SolveRecord[] = [];
    
    // Start with all data
    allSolves = sessions.flatMap(session => session.solves);
    
    // Apply session filter if enabled
    if (filters.currentSession) {
      const activeSession = getActiveSession();
      const activeSessionSolves = activeSession?.solves || [];
      allSolves = allSolves.filter(solve => 
        activeSessionSolves.some((sessionSolve: any) => sessionSolve.id === solve.id)
      );
    }
    
    // Apply cube type filter if enabled
    if (filters.currentCube) {
      allSolves = allSolves.filter(solve => (solve.puzzleType || '333') === currentCubeType);
    }
    
    // Sort by timestamp (newest first)
    return allSolves.sort((a, b) => b.timestamp - a.timestamp);
  };

  // Process data for graph axes
  const processDataForAxis = (solves: SolveRecord[], axis: CustomAxis): number[] => {
    return solves.map((solve, index) => {
      switch (axis) {
        case 'solve-time':
          if (solve.state === 'dnf') return NaN;
          return solve.state === 'plus2' ? solve.time + 2000 : solve.time;
        case 'inspection-time':
          return solve.inspectionTime || 0;
        case 'average':
          // Use ao5 if available, fallback to ao12, then simple moving average
          if (solve.ao5 !== undefined) return solve.ao5 || NaN;
          if (solve.ao12 !== undefined) return solve.ao12 || NaN;
          // Simple 5-solve moving average as fallback
          const recentSolves = solves.slice(index, index + 5);
          const validTimes = recentSolves
            .filter(s => s.state !== 'dnf')
            .map(s => s.state === 'plus2' ? s.time + 2000 : s.time);
          return validTimes.length >= 3 ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length : NaN;
        case 'time':
          // Use solve index as chronological time (reverse order since newest first)
          return solves.length - index - 1;
        default:
          return 0;
      }
    });
  };

  // Get chart data - COMPUTED FRESH EVERY RENDER
  const getChartData = () => {
    const solves = getFilteredSolves();
    if (solves.length === 0) return [];

    let xAxis: CustomAxis, yAxis: CustomAxis;
    
    if (viewMode === 'preset') {
      switch (selectedPreset) {
        case 'times-vs-time':
          xAxis = 'time';
          yAxis = 'solve-time';
          break;
        case 'ao5-vs-time':
          xAxis = 'time';
          yAxis = 'average';
          break;
        case 'ao12-vs-time':
          xAxis = 'time';
          yAxis = 'average';
          break;
        case 'inspection-vs-time':
          xAxis = 'time';
          yAxis = 'inspection-time';
          break;
        default:
          xAxis = 'time';
          yAxis = 'solve-time';
      }
    } else {
      xAxis = customConfig.xAxis;
      yAxis = customConfig.yAxis;
    }

    const xData = processDataForAxis(solves, xAxis);
    const yData = processDataForAxis(solves, yAxis);
    
    // Create chart data points
    return xData.map((x, i) => ({
      x,
      y: yData[i],
      solve: solves[i],
      // Format for tooltip display
      timeFormatted: formatTime(solves[i]?.time || 0),
      ao5Formatted: solves[i]?.ao5 ? formatTime(solves[i].ao5) : null,
      inspectionFormatted: solves[i]?.inspectionTime ? `${solves[i].inspectionTime?.toFixed(1)}s` : null,
      timestampFormatted: new Date(solves[i]?.timestamp || 0).toLocaleTimeString(),
      stateFormatted: solves[i]?.state !== 'ok' ? solves[i]?.state?.toUpperCase() : null
    })).filter(point => !isNaN(point.x) && !isNaN(point.y));
  };

  // Determine if we should show connecting lines (only for time-based x-axis)
  const shouldShowLines = () => {
    if (viewMode === 'preset') {
      return ['times-vs-time', 'ao5-vs-time', 'ao12-vs-time', 'inspection-vs-time'].includes(selectedPreset);
    } else {
      return customConfig.xAxis === 'time';
    }
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div 
          className="px-2 py-1 text-xs rounded shadow-lg border"
          style={{
            background: theme === 'light' ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            color: theme === 'light' ? 'white' : 'black',
            borderColor: theme === 'light' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div>Time: {data.timeFormatted}</div>
          {data.stateFormatted && <div>State: {data.stateFormatted}</div>}
          {data.ao5Formatted && <div>Ao5: {data.ao5Formatted}</div>}
          {data.inspectionFormatted && <div>Inspect: {data.inspectionFormatted}</div>}
          <div>{data.timestampFormatted}</div>
        </div>
      );
    }
    return null;
  };

  // Get fresh chart data every render
  const chartData = getChartData();

  // Graph renderer
  const renderGraph = () => {
    if (chartData.length === 0) {
      return (
        <div 
          className="w-full h-32 flex items-center justify-center rounded-lg mb-3"
          style={{ 
            background: theme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)',
            border: `1px solid ${borderColor}`
          }}
        >
          <div className="text-center">
            <div className="text-lg mb-1">📊</div>
            <div className="text-xs" style={{ color: textSecondary }}>
              No data available
            </div>
          </div>
        </div>
      );
    }

    const showLines = shouldShowLines();
    const chartColor = theme === 'light' ? '#3b82f6' : '#60a5fa';

    return (
      <div 
        className="w-full rounded-lg mb-3"
        style={{ 
          background: theme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)',
          border: `1px solid ${borderColor}`,
          height: '140px'
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {showLines ? (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <XAxis dataKey="x" type="number" scale="linear" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="linear" 
                dataKey="y" 
                stroke={chartColor} 
                strokeWidth={2}
                dot={{ fill: chartColor, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: chartColor }}
              />
            </LineChart>
          ) : (
            <ScatterChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <XAxis dataKey="x" type="number" hide />
              <YAxis dataKey="y" type="number" hide />
              <Tooltip content={<CustomTooltip />} />
              <Scatter fill={chartColor} />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div 
      className="fixed bottom-6 right-6 z-40 transition-all duration-300"
      style={{
        opacity: isFocused ? 0 : 1,
        transform: isFocused ? 'translateY(10px)' : 'translateY(0)'
      }}
    >
      <div 
        className="rounded-xl border p-4 w-80"
        style={{
          background: bgColor,
          backdropFilter: 'blur(12px)',
          borderColor: borderColor,
          boxShadow: theme === 'light' ? '0 4px 20px rgba(0, 0, 0, 0.08)' : '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header with mode toggle */}
        <div className="flex items-center justify-between mb-3">
          <div 
            className="font-medium text-sm"
            style={{ color: textPrimary }}
          >
            Performance
          </div>
          
          {/* Mode Toggle */}
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('preset')}
              className="px-2 py-1 text-xs rounded transition-colors"
              style={{
                background: viewMode === 'preset' ? buttonBg : 'transparent',
                color: viewMode === 'preset' ? textPrimary : textSecondary,
                border: viewMode === 'preset' ? `1px solid ${buttonBorder}` : '1px solid transparent'
              }}
            >
              Preset
            </button>
            <button
              onClick={() => setViewMode('custom')}
              className="px-2 py-1 text-xs rounded transition-colors"
              style={{
                background: viewMode === 'custom' ? buttonBg : 'transparent',
                color: viewMode === 'custom' ? textPrimary : textSecondary,
                border: viewMode === 'custom' ? `1px solid ${buttonBorder}` : '1px solid transparent'
              }}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Data Filter Toggle Buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setFilters(prev => ({ ...prev, currentSession: !prev.currentSession }))}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              background: filters.currentSession ? buttonBg : 'transparent',
              color: filters.currentSession ? textPrimary : textSecondary,
              border: filters.currentSession ? `1px solid ${buttonBorder}` : '1px solid transparent'
            }}
          >
            Current Session
          </button>
          <button
            onClick={() => setFilters(prev => ({ ...prev, currentCube: !prev.currentCube }))}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              background: filters.currentCube ? buttonBg : 'transparent',
              color: filters.currentCube ? textPrimary : textSecondary,
              border: filters.currentCube ? `1px solid ${buttonBorder}` : '1px solid transparent'
            }}
          >
            Current Cube
          </button>
        </div>

        {/* Preset View Selector */}
        {viewMode === 'preset' && (
          <div className="flex gap-1 mb-3 flex-wrap">
            {[
              { value: 'times-vs-time' as PresetView, label: 'Times' },
              { value: 'ao5-vs-time' as PresetView, label: 'Ao5' },
              { value: 'ao12-vs-time' as PresetView, label: 'Ao12' },
              { value: 'inspection-vs-time' as PresetView, label: 'Inspection' }
            ].map((preset) => (
              <button
                key={preset.value}
                onClick={() => setSelectedPreset(preset.value)}
                className="px-2 py-1 text-xs rounded transition-colors flex-1"
                style={{
                  background: selectedPreset === preset.value ? buttonBg : 'transparent',
                  color: selectedPreset === preset.value ? textPrimary : textSecondary,
                  border: selectedPreset === preset.value ? `1px solid ${buttonBorder}` : '1px solid transparent',
                  minWidth: 'fit-content'
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {/* Custom Axis Selectors */}
        {viewMode === 'custom' && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: textSecondary, minWidth: '20px' }}>X:</span>
              <select
                value={customConfig.xAxis}
                onChange={(e) => setCustomConfig(prev => ({ ...prev, xAxis: e.target.value as CustomAxis }))}
                className="flex-1 text-xs rounded px-2 py-1 border"
                style={{
                  background: buttonBg,
                  color: textPrimary,
                  border: `1px solid ${buttonBorder}`
                }}
              >
                <option value="time">Time</option>
                <option value="solve-time">Solve Time</option>
                <option value="average">Average</option>
                <option value="inspection-time">Inspection Time</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: textSecondary, minWidth: '20px' }}>Y:</span>
              <select
                value={customConfig.yAxis}
                onChange={(e) => setCustomConfig(prev => ({ ...prev, yAxis: e.target.value as CustomAxis }))}
                className="flex-1 text-xs rounded px-2 py-1 border"
                style={{
                  background: buttonBg,
                  color: textPrimary,
                  border: `1px solid ${buttonBorder}`
                }}
              >
                <option value="time">Time</option>
                <option value="solve-time">Solve Time</option>
                <option value="average">Average</option>
                <option value="inspection-time">Inspection Time</option>
              </select>
            </div>
          </div>
        )}

        {/* Graph Area */}
        {renderGraph()}
        
        {/* Stats Summary */}
        <div className="flex justify-between text-xs" style={{ color: textSecondary }}>
          {(() => {
            if (chartData.length === 0) {
              return (
                <>
                  <div><span className="opacity-60">Latest: </span><span>--</span></div>
                  <div><span className="opacity-60">Best: </span><span>--</span></div>
                  <div><span className="opacity-60">Avg: </span><span>--</span></div>
                </>
              );
            }
            
            const yData = chartData.map(d => d.y);
            const latest = yData[0];
            const best = Math.min(...yData);
            const avg = yData.reduce((a, b) => a + b, 0) / yData.length;
            
            // Check if we're showing time-based data
            const isTimeData = viewMode === 'preset' 
              ? ['times-vs-time', 'ao5-vs-time', 'ao12-vs-time'].includes(selectedPreset)
              : customConfig.yAxis === 'solve-time' || customConfig.yAxis === 'average';
            
            return (
              <>
                <div>
                  <span className="opacity-60">Latest: </span>
                  <span>{isTimeData ? formatTime(latest) : latest.toFixed(1)}</span>
                </div>
                <div>
                  <span className="opacity-60">Best: </span>
                  <span>{isTimeData ? formatTime(best) : best.toFixed(1)}</span>
                </div>
                <div>
                  <span className="opacity-60">Avg: </span>
                  <span>{isTimeData ? formatTime(avg) : avg.toFixed(1)}</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default GraphWidget;