import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const SeatManagement = () => {
  const { user } = useOutletContext();
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Custom grid dimensions
  const [gridRows, setGridRows] = useState(10);
  const [gridCols, setGridCols] = useState(15);

  // Active tool: changing category vs marking as damaged/aisle
  const [activeTool, setActiveTool] = useState('Silver'); 

  useEffect(() => {
    fetchSeats();
  }, [user]);

  const fetchSeats = async () => {
    if (!user?.theatre_id) return;
    try {
      const res = await fetch(`http://localhost:5000/admin/theatre/${user.theatre_id}/seats`, {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.seats && data.seats.length > 0) {
          setSeats(data.seats);
          
          // Calculate grid dimensions based on saved data
          const maxCol = Math.max(...data.seats.map(s => s.col_num));
          const maxRowCode = Math.max(...data.seats.map(s => s.row_name.charCodeAt(0)));
          setGridCols(maxCol);
          setGridRows(maxRowCode - 64); // 'A' is 65, so 'A' - 64 = 1
        } else {
          generateNewGrid(10, 15); // Default fallback
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateNewGrid = (rowsNum, colsNum) => {
    const newSeats = [];
    for(let r = 1; r <= rowsNum; r++) {
      const rowName = String.fromCharCode(64 + r); 
      for(let c = 1; c <= colsNum; c++) {
        newSeats.push({ row_name: rowName, col_num: c, category: 'Silver', status: 'available' });
      }
    }
    setSeats(newSeats);
  };

  const handleGenerateClick = () => {
    if (window.confirm("Generating a new grid will overwrite your current unsaved layout. Continue?")) {
      generateNewGrid(gridRows, gridCols);
    }
  };

  // Helper function to apply the current tool to a seat
  const applyToolToSeat = (seat) => {
    if (['damaged', 'available', 'aisle'].includes(activeTool)) {
      return { ...seat, status: activeTool };
    } else {
      return { ...seat, category: activeTool, status: 'available' }; 
    }
  };

  // 1. Single Seat Click
  const handleSeatClick = (row, col) => {
    setSeats(prevSeats => prevSeats.map(seat => {
      if (seat.row_name === row && seat.col_num === col) {
        return applyToolToSeat(seat);
      }
      return seat;
    }));
  };

  // 2. Bulk Row Click
  const handleRowClick = (row) => {
    setSeats(prevSeats => prevSeats.map(seat => {
      if (seat.row_name === row) {
        return applyToolToSeat(seat);
      }
      return seat;
    }));
  };

  // 3. Bulk Column Click
  const handleColClick = (col) => {
    setSeats(prevSeats => prevSeats.map(seat => {
      if (seat.col_num === col) {
        return applyToolToSeat(seat);
      }
      return seat;
    }));
  };

  const saveLayout = async () => {
    const loadingToast = toast.loading('Saving layout...');
    try {
      const res = await fetch(`http://localhost:5000/admin/theatre/${user.theatre_id}/seats`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seats })
      });
      if (res.ok) {
        toast.success("Seat layout saved successfully!", { id: loadingToast });
      } else {
        toast.error("Failed to save layout.", { id: loadingToast });
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while saving.", { id: loadingToast });
    }
  };

  const getSeatStyle = (seat) => {
    if (!seat) return 'bg-slate-200 dark:bg-[#333] border-slate-300 dark:border-[#444]';
    
    // Aisle: Make it look like an empty space but keep it clickable
    if (seat.status === 'aisle') return 'bg-transparent border-2 border-dashed border-slate-300 dark:border-[#444] opacity-30 hover:opacity-100 hover:border-indigo-400 transition-all';
    
    // Damaged
    if (seat.status === 'damaged') return 'bg-rose-500 border-rose-600 text-white cursor-not-allowed opacity-50';
    
    // Categories
    switch(seat.category) {
      case 'Platinum': return 'bg-purple-500 border-purple-600 text-white shadow-sm';
      case 'Gold': return 'bg-amber-400 border-amber-500 text-white shadow-sm';
      case 'Silver': default: return 'bg-slate-300 border-slate-400 text-slate-800 dark:bg-slate-600 dark:border-slate-500 dark:text-white shadow-sm';
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-white">Loading Layout...</div>;

  const renderRows = Array.from({ length: gridRows }, (_, i) => String.fromCharCode(65 + i));
  const renderCols = Array.from({ length: gridCols }, (_, i) => i + 1);

  return (
    <div className="p-6">
    <Toaster position="top-right" reverseOrder={false} />
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 p-5 rounded-2xl bg-white/40 dark:bg-[rgba(30,30,30,0.95)] backdrop-blur-md border border-white/50 dark:border-[#333] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Seat Management</h1>
          <p className="text-sm text-slate-500 dark:text-[#B3B3B3]">Design your layout. Click row/col labels for bulk actions.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-[#1A1A1A] p-3 rounded-xl border border-slate-200 dark:border-[#444]">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-[#888] uppercase">Rows</label>
            <input type="number" min="1" max="26" value={gridRows} onChange={(e) => setGridRows(Number(e.target.value))} className="w-16 p-1.5 text-center rounded bg-slate-100 dark:bg-[#333] border border-slate-300 dark:border-[#555] text-sm font-bold outline-none text-slate-800 dark:text-white" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-[#888] uppercase">Cols</label>
            <input type="number" min="1" max="50" value={gridCols} onChange={(e) => setGridCols(Number(e.target.value))} className="w-16 p-1.5 text-center rounded bg-slate-100 dark:bg-[#333] border border-slate-300 dark:border-[#555] text-sm font-bold outline-none text-slate-800 dark:text-white" />
          </div>
          <button onClick={handleGenerateClick} className="px-3 py-1.5 rounded text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800 transition-colors">
            Setup Grid
          </button>
        </div>

        <button onClick={saveLayout} className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#E50914] dark:hover:bg-[#B20710] shadow-[0_4px_15px_rgba(79,70,229,0.3)] transition-colors">
          Save Layout
        </button>
      </header>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Toolbox / Legend */}
        <div className="xl:w-1/4 p-5 rounded-2xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#333] h-fit sticky top-6">
          <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">Seat Tools</h3>
          <p className="text-[11px] text-slate-500 dark:text-[#888] mb-4 bg-slate-100 dark:bg-[#222] p-2 rounded-lg border border-slate-200 dark:border-[#444]">
            💡 <strong className="text-indigo-500 dark:text-indigo-400">Pro Tip:</strong> Click a row letter (A) or column number (1) on the map to apply the tool to the entire line at once!
          </p>
          
          <div className="flex flex-col gap-3">
            {/* Categories */}
            <button onClick={() => setActiveTool('Silver')} className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${activeTool === 'Silver' ? 'border-indigo-500 dark:border-[#E50914] bg-indigo-50 dark:bg-white/10 shadow-sm' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}>
              <div className="w-6 h-6 rounded bg-slate-300 dark:bg-slate-600 border border-slate-400 dark:border-slate-500 shadow-sm"></div>
              <span className="font-semibold dark:text-white text-slate-800">Silver Class</span>
            </button>
            <button onClick={() => setActiveTool('Gold')} className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${activeTool === 'Gold' ? 'border-indigo-500 dark:border-[#E50914] bg-indigo-50 dark:bg-white/10 shadow-sm' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}>
              <div className="w-6 h-6 rounded bg-amber-400 border border-amber-500 shadow-sm"></div>
              <span className="font-semibold dark:text-white text-slate-700">Gold Class</span>
            </button>
            <button onClick={() => setActiveTool('Platinum')} className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${activeTool === 'Platinum' ? 'border-indigo-500 dark:border-[#E50914] bg-indigo-50 dark:bg-white/10 shadow-sm' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}>
              <div className="w-6 h-6 rounded bg-purple-500 border border-purple-600 shadow-sm"></div>
              <span className="font-semibold dark:text-white text-slate-700">Platinum Class</span>
            </button>
            
            <hr className="border-slate-200 dark:border-[#333] my-2" />
            
            {/* Utilities */}
            <button onClick={() => setActiveTool('aisle')} className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${activeTool === 'aisle' ? 'border-indigo-500 dark:border-[#E50914] bg-indigo-50 dark:bg-white/10 shadow-sm' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}>
              <div className="w-6 h-6 rounded border-2 border-dashed border-slate-400 flex items-center justify-center opacity-50"></div>
              <div className="flex flex-col items-start">
                <span className="font-semibold dark:text-white text-slate-700">Create Aisle</span>
              </div>
            </button>

            <button onClick={() => setActiveTool('damaged')} className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${activeTool === 'damaged' ? 'border-indigo-500 dark:border-[#E50914] bg-indigo-50 dark:bg-white/10 shadow-sm' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}>
              <div className="w-6 h-6 rounded bg-rose-500 border border-rose-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">✕</div>
              <span className="font-semibold dark:text-white text-rose-500">Mark Maintanance</span>
            </button>

            <button onClick={() => setActiveTool('available')} className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${activeTool === 'available' ? 'border-indigo-500 dark:border-[#E50914] bg-indigo-50 dark:bg-white/10 shadow-sm' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}>
              <div className="w-6 h-6 rounded border-2 border-dashed border-emerald-500 flex items-center justify-center text-emerald-500 text-xs font-bold">✓</div>
              <span className="font-semibold dark:text-white text-emerald-500">Restore Seat</span>
            </button>
          </div>
        </div>

        {/* Seat Grid Map */}
        <div className="xl:w-3/4 p-6 rounded-2xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#333] overflow-x-auto select-none">
          <div className="min-w-max pb-10">
            {/* Screen indicator */}
            <div className="w-3/4 max-w-2xl mx-auto h-8 border-t-4 border-indigo-300 dark:border-[#555] rounded-[50%] mb-12 flex items-center justify-center shadow-[0_-10px_20px_rgba(165,180,252,0.15)] dark:shadow-[0_-10px_20px_rgba(255,255,255,0.03)]">
              <span className="text-slate-400 dark:text-[#777] font-bold tracking-widest text-sm mt-4">SCREEN</span>
            </div>

            <div className="flex flex-col gap-3 items-center">
              
              {/* 🆕 COLUMN HEADERS (Clickable) 🆕 */}
              <div className="flex items-center gap-4 mb-2">
                <span className="w-6"></span> {/* Spacer for left row label */}
                <div className="flex gap-2">
                  {renderCols.map(colNum => (
                    <div 
                      key={`header-${colNum}`} 
                      onClick={() => handleColClick(colNum)}
                      className="w-8 h-7 flex items-center justify-center rounded bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 dark:bg-[#222] dark:hover:bg-indigo-900/50 dark:hover:text-indigo-400 text-slate-500 dark:text-[#888] cursor-pointer transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                      title={`Apply ${activeTool} to entirely Column ${colNum}`}
                    >
                      <span className="text-[11px] font-bold">{colNum}</span>
                    </div>
                  ))}
                </div>
                <span className="w-6"></span> {/* Spacer for right row label */}
              </div>

              {/* ROWS */}
              {renderRows.map(rowLabel => (
                <div key={rowLabel} className="flex items-center gap-4 group">
                  
                  {/* 🆕 LEFT ROW LABEL (Clickable) 🆕 */}
                  <div 
                    onClick={() => handleRowClick(rowLabel)}
                    className="w-6 h-8 flex items-center justify-center rounded bg-transparent group-hover:bg-slate-100 hover:!bg-indigo-100 hover:!text-indigo-600 dark:group-hover:bg-[#222] dark:hover:!bg-indigo-900/50 dark:hover:!text-indigo-400 text-slate-400 dark:text-[#666] cursor-pointer transition-colors"
                    title={`Apply ${activeTool} to entirely Row ${rowLabel}`}
                  >
                    <span className="font-bold text-sm">{rowLabel}</span>
                  </div>
                  
                  {/* SEATS */}
                  <div className="flex gap-2">
                    {renderCols.map(colNum => {
                      const seat = seats.find(s => s.row_name === rowLabel && s.col_num === colNum) || 
                                   { row_name: rowLabel, col_num: colNum, status: 'available', category: 'Silver' };
                      
                      const isAisle = seat.status === 'aisle';

                      return (
                        <div 
                          key={`${rowLabel}-${colNum}`}
                          onClick={() => handleSeatClick(rowLabel, colNum)}
                          className={`w-8 h-8 rounded-t-lg rounded-b-sm border-b-4 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${getSeatStyle(seat)}`}
                          title={isAisle ? `Aisle Space` : `Row ${rowLabel} - Seat ${colNum} (${seat.category})`}
                        >
                          {/* Hide number if it's an aisle to make it look empty */}
                          {!isAisle && <span className="text-[10px] font-bold opacity-80">{colNum}</span>}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* 🆕 RIGHT ROW LABEL (Clickable) 🆕 */}
                  <div 
                    onClick={() => handleRowClick(rowLabel)}
                    className="w-6 h-8 flex items-center justify-center rounded bg-transparent group-hover:bg-slate-100 hover:!bg-indigo-100 hover:!text-indigo-600 dark:group-hover:bg-[#222] dark:hover:!bg-indigo-900/50 dark:hover:!text-indigo-400 text-slate-400 dark:text-[#666] cursor-pointer transition-colors"
                    title={`Apply ${activeTool} to entirely Row ${rowLabel}`}
                  >
                    <span className="font-bold text-sm">{rowLabel}</span>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatManagement;