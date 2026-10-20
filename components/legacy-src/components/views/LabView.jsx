/** LabView: React-owned view markup. Feature data/actions are progressively isolated in feature hooks. */
export default function LabView({ active = false }) {
  return (
<section className={`tab-view ${active ? 'active' : ''}`} id="view-lab">
      <div className="view-wrap lab-wrap">
        <div className="section-head" style={{paddingTop: '0'}}>
          <h2>3D Algorithm Simulation Lab</h2>
          <p className="sub">Explore live WebGL simulations for graph pathfinding, binary search range halving, and sorting mechanics.</p>
          </div>
        
        <div className="lab-selector-bar">
          <button className="lab-tab-btn active" data-lab="pathfinding">3D Pathfinding (BFS / Dijkstra / A*)</button>
          <button className="lab-tab-btn" data-lab="binsearch">3D Binary Search System</button>
          <button className="lab-tab-btn" data-lab="bubble">3D Bubble Sort Orbital Physics</button>
          </div>
        
        <div className="lab-display-card" id="lab-card-pathfinding">
          <div className="pf-grid">
            <div className="pf-left-panel">
              <h3 style={{fontSize: '28px', fontWeight: '700', letterSpacing: '-0.04em'}}>Shortest Path In 3D</h3>
              <p className="sm" style={{margin: '8px 0 20px'}}>Click any tile on the 3D grid to place or remove walls and high-cost mud.</p>
              <div className="filter-btn-group" style={{marginBottom: '14px'}}>
                <button className="lab-pf-algo-btn active" data-a="0">BFS</button>
                <button className="lab-pf-algo-btn" data-a="1">Dijkstra</button>
                <button className="lab-pf-algo-btn" data-a="2">A*</button>
                </div>
              <div className="bs-sort-controls" style={{marginTop: '0', marginBottom: '20px'}}>
                <button className="bs-ctl-btn" id="lab-pf-pz">Pause</button>
                <button className="bs-ctl-btn" id="lab-pf-sp">Speed 1x</button>
                <button className="bs-ctl-btn" id="lab-pf-nm">New Maze</button>
                </div>
              <table className="simple-table" style={{fontSize: '13px', marginBottom: '16px'}}>
                <thead>
                  <tr>
                    <th>Algorithm</th>
                    <th>Expanded</th>
                    <th>Steps</th>
                    <th>Cost</th>
                    </tr>
                  </thead>
                <tbody id="lab-pf-table" />
                </table>
              <div className="act-legend" style={{fontSize: '12px', marginTop: '0'}}>
                <span><i style={{width: '10px', height: '10px', background: '#1d2740', display: 'inline-block'}} /> Wall</span>
                <span><i style={{width: '10px', height: '10px', background: '#d6c9a8', display: 'inline-block'}} /> Mud (Cost 5)</span>
                <span><i style={{width: '10px', height: '10px', background: '#FF5A36', display: 'inline-block'}} /> Frontier / Path</span>
                <span><i style={{width: '10px', height: '10px', background: '#8da2bd', display: 'inline-block'}} /> Visited</span>
                </div>
              </div>
            <div className="pf-stage-canvas-wrap">
              <canvas className="dash-stage-canvas" id="lab-pf-canvas" />
              </div>
            </div>
          </div>
        
        <div className="lab-display-card" id="lab-card-binsearch" style={{display: 'none'}}>
          <div style={{padding: '24px 32px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <h3 style={{fontSize: '22px', fontWeight: '700'}}>Monotonic Binary Search in Physical 3D Space</h3>
              <p className="sm">Watch the active search interval halve with every iteration step.</p>
              </div>
            <div className="bs-readout" id="lab-bs-ro" style={{position: 'static', textAlign: 'right'}}>ready</div>
            </div>
          <div style={{position: 'relative', height: '500px'}}>
            <canvas className="dash-stage-canvas" id="lab-bs-canvas" />
            </div>
          </div>
        
        <div className="lab-display-card" id="lab-card-bubble" style={{display: 'none'}}>
          <div style={{padding: '24px 32px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'}}>
            <div>
              <h3 style={{fontSize: '22px', fontWeight: '700'}}>Bubble Sort Orbital Swap Physics</h3>
              <p className="sm">Compare and swap adjacent pucks until all elements lock into sorted order.</p>
              </div>
            <div className="bs-sort-controls" style={{marginTop: '0'}}>
              <button className="bs-ctl-btn" id="lab-sort-pz">Pause</button>
              <button className="bs-ctl-btn" id="lab-sort-sp">Speed 1x</button>
              <button className="bs-ctl-btn" id="lab-sort-sh">Shuffle</button>
              </div>
            </div>
          <div style={{position: 'relative', height: '500px'}}>
            <canvas className="dash-stage-canvas" id="lab-sort-canvas" />
            <div className="bs-readout" id="lab-sort-ro">ready</div>
            </div>
          </div>
        </div>
      </section>
  );
}
