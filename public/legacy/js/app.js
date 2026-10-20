/**
 * Top-X Unified Application Logic
 * Integrates Workspace, Leaderboard, Vault, Blueprints, Roadmaps, Visualizer Lab, and Search Palette.
 */

(function() {
  'use strict';

  // Keep API calls same-origin so the HttpOnly SQL-backed session cookie is sent.
  var nativeFetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    init = init || {}; var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf('/api/') === 0) {
      init.credentials = 'same-origin';
    }
    return nativeFetch(input, init);
  };

  // State objects
  var currentTab = 'dashboard';
  var currentUserKey = 'A';
  var currentUserData = null;
  var currentAuthUser = null;
  var roadmapSaved = { dsa: {}, cp: {} };
  var progressWriteQueue = Promise.resolve();
  var visualizerInstances = {
    binarySearchDash: null,
    binarySearchLab: null,
    bubbleSortLB: null,
    bubbleSortLab: null,
    pathfindingLab: null
  };

  // Helper
  function $(id) { return document.getElementById(id); }
  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>\"']/g, function(ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  // =========================================================================
  // 1. TOAST SYSTEM
  // =========================================================================
  function showToast(message, icon) {
    var container = $('toast-container');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast-pill';
    toast.innerHTML = (icon ? '<span>' + escapeHTML(icon) + '</span>' : '<span>⚡</span>') + '<span>' + escapeHTML(message) + '</span>';
    container.appendChild(toast);

    setTimeout(function() {
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2800);
  }

  // =========================================================================
  // 2. LIGHT THEME
  // =========================================================================
  function initTheme() {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  }

  // =========================================================================
  // 3. NAVIGATION & ROUTER
  // =========================================================================
  function initRouter() {
    var topxHeader = document.querySelector('.app-header');
    if (topxHeader) {
      var updateHeaderScroll = function() { topxHeader.classList.toggle('is-scrolled', window.scrollY > 4); };
      updateHeaderScroll();
      window.addEventListener('scroll', updateHeaderScroll, { passive: true });
    }
    var navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(function(btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        var tab = this.dataset.tab;
        if (!tab) return;
        switchTab(tab);
        closeTopXDrawer();
        var menu = document.getElementById('resources-menu');
        var trigger = document.getElementById('resources-menu-trigger');
        if (menu && trigger && menu.contains(this)) {
          menu.hidden = true;
          trigger.setAttribute('aria-expanded', 'false');
        }
      };
    });

    var resourcesTrigger = document.getElementById('resources-menu-trigger');
    var resourcesMenu = document.getElementById('resources-menu');
    if (resourcesTrigger && resourcesMenu && !resourcesTrigger.dataset.bound) {
      resourcesTrigger.dataset.bound = '1';
      resourcesMenu.hidden = true;
      resourcesTrigger.setAttribute('aria-expanded', 'false');

      resourcesTrigger.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        var shouldOpen = resourcesMenu.hidden;
        resourcesMenu.hidden = !shouldOpen;
        resourcesTrigger.setAttribute('aria-expanded', String(shouldOpen));
      });

      resourcesMenu.addEventListener('click', function(event) {
        var item = event.target.closest('[data-tab]');
        if (item) {
          resourcesMenu.hidden = true;
          resourcesTrigger.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('click', function(event) {
        if (!resourcesMenu.contains(event.target) && !resourcesTrigger.contains(event.target)) {
          resourcesMenu.hidden = true;
          resourcesTrigger.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
          resourcesMenu.hidden = true;
          resourcesTrigger.setAttribute('aria-expanded', 'false');
          resourcesTrigger.focus();
        }
      });
    }

    // Responsive slide-over navigation controls
    var mobileMenuButton = document.getElementById('topx-mobile-menu');
    var mobileDrawer = document.getElementById('topx-mobile-drawer');
    var mobileBackdrop = document.getElementById('topx-drawer-backdrop');
    var mobileClose = document.getElementById('topx-drawer-close');
    function openTopXDrawer() {
      if (!mobileDrawer || !mobileBackdrop) return;
      mobileDrawer.classList.add('is-open');
      mobileBackdrop.hidden = false;
      mobileDrawer.setAttribute('aria-hidden', 'false');
      if (mobileMenuButton) mobileMenuButton.setAttribute('aria-expanded', 'true');
      document.body.classList.add('topx-drawer-open');
    }
    window.closeTopXDrawer = function() {
      if (!mobileDrawer || !mobileBackdrop) return;
      mobileDrawer.classList.remove('is-open');
      mobileBackdrop.hidden = true;
      mobileDrawer.setAttribute('aria-hidden', 'true');
      if (mobileMenuButton) mobileMenuButton.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('topx-drawer-open');
    };
    if (mobileMenuButton) mobileMenuButton.addEventListener('click', openTopXDrawer);
    if (mobileClose) mobileClose.addEventListener('click', window.closeTopXDrawer);
    if (mobileBackdrop) mobileBackdrop.addEventListener('click', window.closeTopXDrawer);
    var drawerSearch = document.getElementById('topx-drawer-search');
    if (drawerSearch) drawerSearch.addEventListener('click', function() {
      window.closeTopXDrawer();
      var searchButton = document.getElementById('search-pill-btn');
      if (searchButton) searchButton.click();
    });
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') window.closeTopXDrawer();
    });

    // Admin entry stays hidden unless an authenticated admin session is active.
    function syncAdminNavVisibility() {
      // Keep admin entry points out of member navigation at all times.
      // Administrators can open /#admin directly and authenticate there.
      ['profile-admin-link', 'topx-mobile-admin'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.hidden = true;
      });
    }
    syncAdminNavVisibility();
    window.topxSyncAdminNavVisibility = syncAdminNavVisibility;


    // Hash sync
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
  }

  function handleHashChange() {
    var hash = window.location.hash.replace('#', '').trim();
    if (hash === 'workspace') hash = 'dashboard';
    var validTabs = ['dashboard', 'profile', 'leaderboard', 'vault', 'blueprints', 'roadmaps', 'lab', 'tasks', 'pro', 'admin', 'guides'];
    if (validTabs.indexOf(hash) > -1) {
      switchTab(hash, false);
    } else if (!hash) {
      switchTab('dashboard', false);
    }
  }

  function switchTab(tabId, updateHash) {
    if (tabId === 'workspace') tabId = 'dashboard';
    if (updateHash !== false) {
      window.location.hash = '#' + tabId;
    }
    currentTab = tabId;

    // Update nav buttons
    document.querySelectorAll('.nav-tab-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update tab view panels
    document.querySelectorAll('.tab-view').forEach(function(panel) {
      panel.classList.toggle('active', panel.id === 'view-' + tabId);
    });

    // Scroll progress update
    updateScrollProgress();

    // Resize active 3D canvases
    setTimeout(function() {
      if (tabId === 'dashboard' && visualizerInstances.binarySearchDash) {
        visualizerInstances.binarySearchDash.resize();
      } else if (tabId === 'leaderboard' && visualizerInstances.bubbleSortLB) {
        visualizerInstances.bubbleSortLB.resize();
      } else if (tabId === 'lab') {
        if (visualizerInstances.pathfindingLab) visualizerInstances.pathfindingLab.resize();
        if (visualizerInstances.binarySearchLab) visualizerInstances.binarySearchLab.resize();
        if (visualizerInstances.bubbleSortLab) visualizerInstances.bubbleSortLab.resize();
      }
    }, 80);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Scroll Progress
  function updateScrollProgress() {
    var bar = $('top-progress');
    if (!bar) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var pct = max > 0 ? (window.scrollY / max * 100) : 0;
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateScrollProgress, { passive: true });

  // Dropdown menus
  function initDropdowns() {
    var triggers = document.querySelectorAll('[data-menu-target]');
    triggers.forEach(function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        var targetId = this.dataset.menuTarget;
        var dropdown = $(targetId);
        if (!dropdown) return;

        var isOpen = dropdown.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) dropdown.classList.add('open');
        this.setAttribute('aria-expanded', String(!isOpen));
      };
    });

    document.addEventListener('click', closeAllDropdowns);
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.menu-dropdown').forEach(function(d) {
      d.classList.remove('open');
    });
    document.querySelectorAll('[data-menu-target]').forEach(function(trigger) {
      trigger.setAttribute('aria-expanded', 'false');
    });
  }

  // =========================================================================
  // 4. WORKSPACE / DASHBOARD MODULE
  // =========================================================================
  function getTopic(id) {
    return CURR.filter(function(t) { return t.id === id; })[0];
  }

  function getConceptCount(topic) {
    return (currentUserData && currentUserData.counts[topic.id]) || 0;
  }

  function getTopicStatus(topic) {
    var c = getConceptCount(topic);
    if (c >= topic.items.length) return 'done';
    if (topic.id === currentUserData.focus) return 't';
    var allPreDone = topic.pre.every(function(pid) {
      var p = getTopic(pid);
      return getConceptCount(p) >= p.items.length || pid === currentUserData.focus;
    });
    return allPreDone ? 'u' : 'l';
  }

  function getCurrentItem(topic) {
    var c = getConceptCount(topic);
    var raw = topic.items[c];
    if (!raw) return null;
    var parts = raw.split('|');
    return { title: parts[0], diff: parts[1] };
  }

  function pickNextFocus() {
    var available = CURR.filter(function(t) { return getTopicStatus(t) === 'u'; });
    return available.length ? available[0].id : null;
  }

  function numAnimate(el, toVal) {
    if (!el) return;
    var fromVal = +el.dataset.v || 0;
    el.dataset.v = toVal;
    var start = performance.now();
    var duration = 900;

    (function frame(now) {
      var progress = Math.min((now - start) / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.round(fromVal + (toVal - fromVal) * ease);
      if (progress < 1) requestAnimationFrame(frame);
    })(performance.now());
  }

  function renderDashboardHero() {
    var hour = new Date().getHours();
    var timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    $('dash-greeting-time').textContent = currentAuthUser && currentAuthUser.name ? timeGreeting + ', ' + currentAuthUser.name + '.' : 'Welcome to TOP-X.';

    var focusTopic = getTopic(currentUserData.focus);
    if ($('dash-active-node-label')) $('dash-active-node-label').textContent = 'Active Node: ' + (focusTopic ? focusTopic.name : 'Complete');
    if (!focusTopic) {
      $('dash-focus-title').textContent = 'Curriculum Complete';
      $('dash-focus-progress').textContent = 'All topics conquered';
      $('dash-focus-ticks').innerHTML = '';
      $('dash-next-title').textContent = 'Upsolve or Enter Live Contest';
      $('dash-next-diff-pill').style.display = 'none';
      $('dash-next-topic').textContent = 'Upsolve revision problems';
      $('dash-why-text').textContent = 'You have mastered every topic on the primary data structures roadmap.';
      return;
    }

    var solvedCount = getConceptCount(focusTopic);
    var nextItem = getCurrentItem(focusTopic);

    $('dash-focus-title').textContent = focusTopic.name;
    $('dash-focus-progress').textContent = solvedCount + ' of ' + focusTopic.items.length + ' concepts';

    var ticksHtml = '';
    for (var i = 0; i < focusTopic.items.length; i++) {
      ticksHtml += '<i class="' + (i < solvedCount ? 'f' : '') + '"></i>';
    }
    $('dash-focus-ticks').innerHTML = ticksHtml;

    if (nextItem) {
      $('dash-next-title').textContent = nextItem.title;
      var diffMap = { E: 'Easy', M: 'Medium', H: 'Hard' };
      var diffClassMap = { E: 'easy', M: 'med', H: 'hard' };
      var pill = $('dash-next-diff-pill');
      pill.style.display = '';
      pill.className = 'diff-pill ' + diffClassMap[nextItem.diff];
      pill.textContent = diffMap[nextItem.diff];
      $('dash-next-topic').textContent = focusTopic.name;
      $('dash-why-text').textContent = WHY[nextItem.title] ||
        ("You've completed " + solvedCount + " of " + focusTopic.items.length + " " + focusTopic.name + " concepts. " + nextItem.title + " builds on them.");
    }
  }

  function renderDashboardStats() {
    var synced = currentAuthUser && currentAuthUser.syncedStats || {};
    var lc = synced.leetcode || {};
    var cf = synced.codeforces || {};
    var cc = synced.codechef || {};
    // Aggregate only real values returned by connected platforms; never invent progress.
    var solved = lc.username ? Number(lc.solved || 0) : cf.handle ? Number(cf.acceptedProblemsLast10000 || 0) : cc.handle ? Number(cc.solved || 0) : 0;
    numAnimate($('stat-solved-num'), solved);
    numAnimate($('stat-streak-num'), Number(currentAuthUser && currentAuthUser.currentStreak || 0));
    numAnimate($('stat-prog-num'), Number(currentAuthUser && currentAuthUser.overallProgress || 0));
    numAnimate($('stat-rating-num'), Number(cf.rating || cc.rating || 0));
    if ($('stat-solved-delta')) $('stat-solved-delta').textContent = lc.username ? 'Live LeetCode profile' : cf.handle ? 'Codeforces accepted submissions (recent 10,000)' : cc.handle ? 'Live CodeChef profile' : 'Connect a platform to load stats';
    if ($('stat-streak-delta')) $('stat-streak-delta').textContent = currentAuthUser && currentAuthUser.currentStreak ? 'Current verified streak' : 'Streak not connected';
    if ($('stat-prog-delta')) $('stat-prog-delta').textContent = currentAuthUser && currentAuthUser.overallProgress ? 'Saved account progress' : 'No progress recorded yet';
    if ($('stat-rating-delta')) $('stat-rating-delta').textContent = cf.rating ? 'Codeforces rating' : cc.rating ? 'CodeChef rating' : 'Connect a platform to load rating';
  }

  function renderDashboardRoadmapDAG() {
    var svg = $('rp-svg');
    if (!svg) return;

    function pos(t) { return { x: 60 + t.c * 160, y: 44 + t.r * 100 }; }
    var edgesHtml = '';
    var nodesHtml = '';

    // Draw Edges
    CURR.forEach(function(topic) {
      topic.pre.forEach(function(pid) {
        var parent = getTopic(pid);
        var pA = pos(parent), pB = pos(topic);
        var x1 = pA.x + 32, x2 = pB.x - 32;
        var mx = (x1 + x2) / 2;
        var d = 'M' + x1 + ' ' + pA.y + ' C' + mx + ' ' + pA.y + ', ' + mx + ' ' + pB.y + ', ' + x2 + ' ' + pB.y;

        var stParent = getTopicStatus(parent);
        var stChild = getTopicStatus(topic);

        if (stParent === 'done' && (stChild === 'done' || stChild === 't')) {
          edgesHtml += '<path class="dag-edge done" d="' + d + '"/>';
        } else if (stParent === 't') {
          edgesHtml += '<path class="dag-edge progress" d="' + d + '"/>';
        } else {
          edgesHtml += '<path class="dag-edge locked" d="' + d + '"/>';
        }
      });
    });

    // Draw Nodes
    CURR.forEach(function(topic) {
      var p = pos(topic);
      var st = getTopicStatus(topic);
      var cCount = getConceptCount(topic);
      var pct = Math.round((cCount / topic.items.length) * 100);

      var iconSvg = st === 'done' ?
        '<path d="M-6 0l4.5 4.5L7-5" stroke="#171717" stroke-width="2.2" fill="none"/>' :
        st === 't' ? '<circle r="6" fill="#FF5A36"/>' :
        st === 'l' ? '<rect x="-6" y="-2" width="12" height="9" fill="#999"/><path d="M-4 -2v-3a4 4 0 018 0v3" stroke="#999" stroke-width="1.6" fill="none"/>' :
        '<circle r="3" fill="#171717"/>';

      var subLabel = st === 'done' ? 'Completed' : st === 't' ? (cCount + ' of ' + topic.items.length) : st === 'u' ? 'Up next' : 'Locked';

      nodesHtml += '<g class="nd ' + st + '" data-topic-id="' + topic.id + '" transform="translate(' + p.x + ',' + p.y + ')">' +
        (st === 't' ? '<circle class="pulse-circle" r="28"/>' : '') +
        '<circle class="node-track" r="26"/>' +
        '<circle class="node-ring" r="26" pathLength="100" style="stroke-dasharray:' + pct + ' 100"/>' +
        '<circle class="node-bg" r="20"/>' +
        iconSvg +
        '<text class="node-title" y="48" text-anchor="middle">' + topic.name + '</text>' +
        '<text class="node-sub" y="64" text-anchor="middle">' + subLabel + '</text>' +
        '</g>';
    });

    svg.innerHTML = '<g>' + edgesHtml + '</g><g>' + nodesHtml + '</g>';

    // Tooltip listener
    var tip = $('dag-tip');
    svg.querySelectorAll('.nd').forEach(function(nodeEl) {
      nodeEl.addEventListener('mouseenter', function() {
        var t = getTopic(this.dataset.topicId);
        var r = this.getBoundingClientRect();
        var parentRect = svg.parentElement.getBoundingClientRect();
        var cCount = getConceptCount(t);

        tip.innerHTML = '<h5>' + t.name + '</h5>' +
          '<div><span>Completion</span><b>' + Math.round((cCount / t.items.length) * 100) + '%</b></div>' +
          '<div><span>Difficulty</span><b>' + t.diff + '</b></div>' +
          '<div><span>Concepts</span><b>' + cCount + ' / ' + t.items.length + '</b></div>';

        tip.style.left = Math.min(r.right - parentRect.left + 10, parentRect.width - 230) + 'px';
        tip.style.top = Math.max(r.top - parentRect.top - 10, 20) + 'px';
        tip.classList.add('show');
      });

      nodeEl.addEventListener('mouseleave', function() {
        tip.classList.remove('show');
      });
    });
  }

  var nextContestStartAt = null;
  function renderContestWidget() {
    if ($('contest-name-txt')) $('contest-name-txt').textContent = 'Loading upcoming contests…';
    if ($('contest-plat-txt')) $('contest-plat-txt').textContent = 'Codeforces';
    if ($('contest-format-txt')) $('contest-format-txt').textContent = 'Official schedule';
    if ($('contest-starts-txt')) $('contest-starts-txt').textContent = 'Fetching live contest schedule';
    if ($('contest-last-name')) $('contest-last-name').textContent = 'Past contest data unavailable';
    if ($('contest-last-rank')) $('contest-last-rank').textContent = '—';
    if ($('contest-last-delta')) $('contest-last-delta').textContent = '—';
    if ($('contest-last-solved')) $('contest-last-solved').textContent = '—';
    fetch('/api/contests/upcoming').then(function(r) { return r.json().then(function(d) { if (!r.ok) throw new Error(d.error || 'Contest schedule unavailable'); return d; }); }).then(function(d) {
      var c = (d.contests || [])[0];
      if (!c) { if ($('contest-name-txt')) $('contest-name-txt').textContent = 'No upcoming Codeforces contests found'; if ($('contest-starts-txt')) $('contest-starts-txt').textContent = 'Check the official schedule later'; nextContestStartAt = null; updateContestTicker(); return; }
      nextContestStartAt = Number(c.startTimeSeconds) * 1000;
      if ($('contest-name-txt')) $('contest-name-txt').textContent = c.name;
      if ($('contest-plat-txt')) $('contest-plat-txt').textContent = 'Codeforces';
      if ($('contest-format-txt')) $('contest-format-txt').textContent = (Number(c.durationSeconds) / 3600).toFixed(1) + ' hours';
      if ($('contest-starts-txt')) $('contest-starts-txt').textContent = new Date(nextContestStartAt).toLocaleString();
      updateContestTicker();
    }).catch(function() { nextContestStartAt = null; if ($('contest-name-txt')) $('contest-name-txt').textContent = 'Contest schedule unavailable'; if ($('contest-starts-txt')) $('contest-starts-txt').textContent = 'Could not reach Codeforces API'; updateContestTicker(); });
  }

  function updateContestTicker() {
    var target = nextContestStartAt;
    if (!target) { if ($('contest-tick-h')) $('contest-tick-h').textContent = '--'; if ($('contest-tick-m')) $('contest-tick-m').textContent = '--'; if ($('contest-tick-s')) $('contest-tick-s').textContent = '--'; return; }
    var diff = Math.max(0, target - Date.now()) / 1000;
    var h = Math.floor(diff / 3600);
    var m = Math.floor((diff % 3600) / 60);
    var s = Math.floor(diff % 60);

    $('contest-tick-h').textContent = h;
    $('contest-tick-m').textContent = String(m).padStart(2, '0');
    $('contest-tick-s').textContent = String(s).padStart(2, '0') + 's';
  }

  function renderRecentProblems() {
    var tbody = $('dash-recent-tbody');
    if (!tbody) return;

    var diffMap = { E: 'Easy', M: 'Medium', H: 'Hard' };
    var diffClassMap = { E: 'easy', M: 'med', H: 'hard' };
    var statusMap = {
      solved: '<span class="status-pill solved">✓ Solved</span>',
      continue: '<span class="status-pill continue">→ Continue</span>',
      revise: '<span class="status-pill revise">Need revision</span>'
    };

    var rowsHtml = '';
    currentUserData.recent.forEach(function(row) {
      var title = row[0], topicId = row[1], diff = row[2], status = row[3], time = row[4];
      var topic = getTopic(topicId);
      rowsHtml += '<tr>' +
        '<td>' + title + '</td>' +
        '<td>' + (topic ? topic.name : topicId) + '</td>' +
        '<td><span class="diff-pill ' + diffClassMap[diff] + '">' + diffMap[diff] + '</span></td>' +
        '<td>' + statusMap[status] + '</td>' +
        '<td class="sm">' + time + '</td>' +
        '</tr>';
    });
    tbody.innerHTML = rowsHtml || '<tr><td colspan="5" class="sm" style="padding:22px;text-align:center">No activity recorded yet. Connect a platform to load live stats.</td></tr>';
  }

  function renderCollegeRank() {
    var r = currentUserData.rank;
    if (!r) {
      if ($('dash-college-ranks')) $('dash-college-ranks').innerHTML = '<div class="sm" style="padding:18px 0">College rankings are not connected yet.</div>';
      if ($('dash-rank-delta')) $('dash-rank-delta').textContent = 'No verified ranking data';
      return;
    }
    var list = [
      ['Overall college', r.o[0], r.o[1]],
      [r.b[0], r.b[1], r.b[2]],
      [r.y[0], r.y[1], r.y[2]]
    ];

    var html = '';
    list.forEach(function(item) {
      var ahead = item[2] - item[1];
      var pct = Math.round((ahead / item[2]) * 100);
      html += '<div class="college-rank-item">' +
        '<div class="rn num">#' + item[1] + '</div>' +
        '<div>' +
        '<b>' + item[0] + '</b>' +
        '<span class="sm" style="display:block">Ahead of ' + ahead + ' of ' + item[2] + ' students</span>' +
        '<div class="rank-progress-bar"><i style="width:' + pct + '%"></i></div>' +
        '</div>' +
        '</div>';
    });
    $('dash-college-ranks').innerHTML = html;
    $('dash-rank-delta').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg> Up ' + r.d + ' positions this week';
  }

  function renderActivityChart() {
    var svg = $('act-svg');
    if (!svg) return;

    var days = currentUserData.activity.days;
    var D = 182, bw = 1200 / D, base = 140, sb = 98;
    var svgContent = '', sp = '', cur = 0, pk = 0, act = 0;
    var cols = ['#D6D6D0', '#FFB9A8', '#FF8C6E', '#FF5A36'];
    var end = new Date();

    days.forEach(function(d) {
      cur = d.sol ? cur + 1 : 0;
      d.st = cur;
      pk = Math.max(pk, cur);
      if (d.sol) act++;
    });
    pk = pk || 1;

    days.forEach(function(d, i) {
      var x = i * bw + bw / 2;
      d.dt = new Date(end - (D - 1 - i) * 864e5);
      svgContent += '<rect x="' + (x - 1.6) + '" y="' + (base - d.sub * 11) + '" width="3.2" height="' + (d.sub * 11) + '" fill="#DADAD4"/>' +
        (d.sol ? '<rect x="' + (x - 1.6) + '" y="' + (base - d.sol * 11) + '" width="3.2" height="' + (d.sol * 11) + '" fill="' + cols[Math.min(d.sol, 3)] + '"/>' : '');

      if (d.con) {
        svgContent += '<line x1="' + x + '" x2="' + x + '" y1="20" y2="' + (base - d.sub * 11) + '" stroke="#171717" stroke-dasharray="1 4" opacity=".5"/>' +
          '<circle cx="' + x + '" cy="14" r="5" fill="#F7F7F5" stroke="#171717" stroke-width="1.5"/>';
      }
      sp += (i ? 'L' : 'M') + x + ' ' + (sb - d.st / pk * 58);
    });

    svgContent = '<line x1="0" x2="1200" y1="' + base + '" y2="' + base + '" stroke="#171717"/>' +
      svgContent +
      '<path d="' + sp + '" fill="none" stroke="#171717" stroke-width="1.4"/>' +
      '<circle cx="' + (1200 - bw / 2) + '" cy="' + (sb - days[D - 1].st / pk * 58) + '" r="4.5" fill="#FF5A36"/>' +
      '<line id="act-crosshair" y1="6" y2="' + base + '" stroke="#FF5A36" opacity="0"/>';

    ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].forEach(function(m, i) {
      svgContent += '<text x="' + (i * D / 6.1 * bw) + '" y="164" font-size="11" fill="#6B6B6B" font-family="Geist">' + m + '</text>';
    });

    svg.innerHTML = svgContent;
    $('dash-act-streak').textContent = currentAuthUser && currentAuthUser.currentStreak || 0;
    $('dash-act-active').textContent = act;
    $('dash-act-solved').textContent = currentAuthUser && currentAuthUser.syncedStats && currentAuthUser.syncedStats.leetcode ? currentAuthUser.syncedStats.leetcode.solved || 0 : 0;

    // Scrubber tooltip
    var tip = $('act-tip');
    svg.addEventListener('mousemove', function(e) {
      var r = svg.getBoundingClientRect();
      var idx = Math.max(0, Math.min(181, Math.floor((e.clientX - r.left) / r.width * 182)));
      var d = days[idx];
      var x = idx * bw + bw / 2;

      var ch = $('act-crosshair');
      if (ch) {
        ch.setAttribute('x1', x);
        ch.setAttribute('x2', x);
        ch.setAttribute('opacity', '0.7');
      }

      tip.innerHTML = '<b>' + d.dt.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' }) + '</b><br>' +
        d.sol + ' solved, ' + d.sub + ' submissions<br>' +
        (d.con ? 'Contest day' : 'Practice session') + (d.st ? ', streak ' + d.st + 'd' : '');

      var parentRect = svg.parentElement.getBoundingClientRect();
      tip.style.left = (e.clientX - parentRect.left + 14) + 'px';
      tip.style.top = (e.clientY - parentRect.top - 50) + 'px';
      tip.style.opacity = '1';
    });

    svg.addEventListener('mouseleave', function() {
      tip.style.opacity = '0';
      var ch = $('act-crosshair');
      if (ch) ch.setAttribute('opacity', '0');
    });
  }

  function generateActivityDays() {
    return Array.from({ length: 182 }, function() { return { sol: 0, sub: 0, con: false, st: 0 }; });
  }

  function loadUser(key) {
    currentUserKey = key;
    currentUserData = JSON.parse(JSON.stringify(SAMPLES[key]));
    if (currentAuthUser) currentUserData.user.name = currentAuthUser.name;
    currentUserData.activity = { days: generateActivityDays() };

    document.querySelectorAll('.proto-btn[data-user]').forEach(function(b) {
      b.classList.toggle('active', b.dataset.user === key);
    });

    renderDashboardHero();
    renderDashboardStats();
    renderDashboardRoadmapDAG();
    renderContestWidget();
    renderRecentProblems();
    renderCollegeRank();
    renderActivityChart();
  }

  function simulateSolveNextProblem() {
    var fTopic = getTopic(currentUserData.focus);
    if (!fTopic) return;
    var item = getCurrentItem(fTopic);
    if (!item) return;

    var days = currentUserData.activity.days;
    currentUserData.recent.unshift([item.title, fTopic.id, item.diff, 'solved', (10 + Math.floor(Math.random() * 25)) + ' min']);
    currentUserData.counts[fTopic.id] = getConceptCount(fTopic) + 1;
    currentUserData.stats.solved++;
    currentUserData.stats.overall = Math.min(100, currentUserData.stats.overall + 1);
    days[days.length - 1].sol++;
    days[days.length - 1].sub++;

    if (getConceptCount(fTopic) >= fTopic.items.length) {
      currentUserData.focus = pickNextFocus();
    }

    renderDashboardHero();
    renderDashboardStats();
    renderDashboardRoadmapDAG();
    renderRecentProblems();
    renderActivityChart();

    showToast('Problem "' + item.title + '" solved! Progress updated 🔥', '🏆');
  }

  // =========================================================================
  // 5. LEADERBOARD MODULE
  // =========================================================================
  var lbScope = 'all';
  var lbFilterVal = null;
  var lbSearchQuery = '';

  var LB_CONFIG = { all: 'All Members' };
  var LB_OPTIONS = {
    year: [1, 2, 3, 4],
    branch: ['CSE', 'IT', 'ECE', 'ME', 'CE'],
    section: ['A', 'B', 'C']
  };
  var YEAR_LABELS = ['1st', '2nd', '3rd', '4th'];

  function initLeaderboard() {
    var scopeGroup = $('lb-scope-group');
    var subGroup = $('lb-sub-group');

    function renderScopeButtons() {
      if (!scopeGroup) return;
      scopeGroup.innerHTML = Object.keys(LB_CONFIG).map(function(k) {
        return '<button class="' + (k === lbScope ? 'active' : '') + '" data-scope="' + k + '">' + LB_CONFIG[k] + '</button>';
      }).join('');
    }

    function renderSubButtons() {
      if (!subGroup) return;
      if (lbScope === 'all') {
        subGroup.innerHTML = '';
        return;
      }
      subGroup.innerHTML = LB_OPTIONS[lbScope].map(function(val) {
        var label = lbScope === 'year' ? (YEAR_LABELS[val - 1] + ' year') : (lbScope === 'section' ? ('Section ' + val) : val);
        return '<button class="' + (val === lbFilterVal ? 'active' : '') + '" data-val="' + val + '">' + label + '</button>';
      }).join('');
    }

    function renderTableAndPodium() {
      var filtered = LEADERBOARD_DATA.filter(function(d) {
        if (lbScope !== 'all') return false;
        if (lbSearchQuery && String(d.n || '').toLowerCase().indexOf(lbSearchQuery) < 0) return false;
        return true;
      }).sort(function(a, b) {
        return b.s - a.s || b.k - a.k;
      });

      $('lb-count-txt').textContent = filtered.length + ' members';

      // Podium Top 3
      var podiumOrder = [1, 0, 2].filter(function(idx) { return filtered[idx]; });
      var flameSvg = '<svg class="flame-icon" viewBox="0 0 24 24"><path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/></svg>';

      $('lb-podium-wrap').innerHTML = podiumOrder.map(function(idx) {
        var d = filtered[idx];
        var initials = String(d.n || 'Member').split(' ').map(function(w) { return w[0]; }).join('').slice(0, 2);
        return '<div class="podium-card rank-' + (idx + 1) + '">' +
          '<div class="rk-num num">' + (idx + 1) + '</div>' +
          '<div class="podium-who">' +
          '<div class="avatar-circle">' + escapeHTML(initials) + '</div>' +
          '<div>' +
          '<div class="podium-name">' + escapeHTML(d.n || 'Member') + '</div>' +
          '<div class="podium-tag">TOP-X member' + (d.isPro ? ' · Pro' : '') + '</div>' +
          '</div>' +
          '</div>' +
          '<div class="podium-stats">' +
          '<div><b>' + d.s + '</b><span>solved</span></div>' +
          '<div><b>' + Number(d.k || 0).toLocaleString() + '</b><span>Rating</span></div>' +
          '</div>' +
          '</div>';
      }).join('');

      // Rest of students table
      var maxSolved = filtered.length ? filtered[0].s : 1;
      var tableRows = filtered.slice(3).map(function(d, i) {
        var initials = String(d.n || 'Member').split(' ').map(function(w) { return w[0]; }).join('').slice(0, 2);
        var barPct = Math.round((d.s / maxSolved) * 100);
        return '<tr>' +
          '<td class="rk-col num">#' + (i + 4) + '</td>' +
          '<td><div class="lb-profile-cell"><div class="avatar-circle">' + initials + '</div>' + escapeHTML(d.n || 'Member') + '</div></td>' +
          '<td>' + (d.isPro ? 'Pro' : 'Free') + '</td>' +
          '<td><div class="lb-progress-bar-cell"><span class="num">' + Number(d.s || 0) + '</span><div class="lb-bar-bg"><div class="lb-bar-fill" style="width:' + barPct + '%"></div></div></div></td>' +
          '<td>' + Number(d.k || 0).toLocaleString() + '</td>' +
          '<td>' + (d.isPro ? 'Top-X Pro' : 'Member') + '</td>' +
          '</tr>';
      }).join('');

      $('lb-tbody').innerHTML = tableRows || '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--mute)">No registered members yet. Be the first to join.</td></tr>';
    }

    if (scopeGroup) {
      scopeGroup.onclick = function(e) {
        var b = e.target.closest('button');
        if (!b) return;
        lbScope = b.dataset.scope;
        lbFilterVal = lbScope === 'all' ? null : LB_OPTIONS[lbScope][0];
        renderScopeButtons();
        renderSubButtons();
        renderTableAndPodium();
      };
    }

    if (subGroup) {
      subGroup.onclick = function(e) {
        var b = e.target.closest('button');
        if (!b) return;
        lbFilterVal = lbScope === 'year' ? +b.dataset.val : b.dataset.val;
        renderSubButtons();
        renderTableAndPodium();
      };
    }

    var searchInput = $('lb-search-input');
    if (searchInput) {
      searchInput.oninput = function() {
        lbSearchQuery = this.value.trim().toLowerCase();
        renderTableAndPodium();
      };
    }

    renderScopeButtons();
    renderSubButtons();
    renderTableAndPodium();
    window.addEventListener('topx:leaderboard-updated', renderTableAndPodium);
    fetch('/api/leaderboard').then(function(r){ return r.json().then(function(d){ if(!r.ok) throw new Error(d.error || 'Leaderboard unavailable'); return d; }); }).then(function(d){
      LEADERBOARD_DATA.splice(0, LEADERBOARD_DATA.length, ...(d.members || []));
      renderTableAndPodium();
    }).catch(function(){ LEADERBOARD_DATA.splice(0, LEADERBOARD_DATA.length); renderTableAndPodium(); });
  }

  // =========================================================================
  // 6. PROBLEM VAULT (LIBRARY) MODULE
  // =========================================================================
  var vaultDone = {};

  var vaultSelCat = 'all';
  var vaultSelDiff = 'all';
  var vaultQuery = '';
  var vaultViewMode = 'cards';
  var vaultBaseProblems = PROBLEMS_DATA.slice();
  var vaultCustomProblems = [];
  var vaultRemovedIds = [];

  function getVaultProblems() {
    var base = vaultBaseProblems.filter(function(p) { return vaultRemovedIds.indexOf(String(p[2])) === -1; });
    var custom = vaultCustomProblems.map(function(p) { return [p.category || 'general', p.title, p.slug, Number(p.difficulty) || 2, Array.isArray(p.companies) ? p.companies : [], p.intuition || '', p.url, p.id]; });
    return base.concat(custom);
  }

  function saveVaultDone() {
    if (!currentAuthUser) return;
    saveUserProgress({ solvedVaultProblemIds: Object.keys(vaultDone).filter(function(id) { return vaultDone[id]; }) });
  }

  function initVault() {
    fetch('/api/vault/problems').then(function(r) { return r.ok ? r.json() : {}; }).then(function(data) {
      vaultCustomProblems = Array.isArray(data.problems) ? data.problems : [];
      vaultRemovedIds = Array.isArray(data.removedIds) ? data.removedIds.map(String) : [];
      vaultCustomProblems.forEach(function(p) { if (p.category && p.categoryName && !PATTERNS_DATA.some(function(c) { return c[0] === p.category; })) PATTERNS_DATA.push([p.category, p.categoryName]); });
      renderVaultProgress(); renderVaultSidebar(); renderVaultProblems();
    }).catch(function(err) { showToast(err.message || 'Could not load curated problems.', '⚠'); });
    renderVaultProgress();
    renderVaultSidebar();
    renderVaultProblems();

    // Difficulty Pills
    document.querySelectorAll('.diff-filter-btn').forEach(function(btn) {
      btn.onclick = function() {
        document.querySelectorAll('.diff-filter-btn').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        vaultSelDiff = this.dataset.diff;
        renderVaultProblems();
      };
    });

    // View mode
    var cardBtn = $('vault-cards-btn');
    var tblBtn = $('vault-table-btn');
    if (cardBtn && tblBtn) {
      cardBtn.onclick = function() {
        cardBtn.classList.add('active'); tblBtn.classList.remove('active');
        $('vault-cards-view').style.display = 'grid';
        $('vault-table-view').style.display = 'none';
      };
      tblBtn.onclick = function() {
        tblBtn.classList.add('active'); cardBtn.classList.remove('active');
        $('vault-cards-view').style.display = 'none';
        $('vault-table-view').style.display = 'block';
      };
    }

    // Search
    var qInput = $('vault-search-input');
    if (qInput) {
      qInput.oninput = function() {
        vaultQuery = this.value.trim().toLowerCase();
        renderVaultProblems();
      };
    }

    // Clicks on problem list
    $('vault-cards-view').onclick = handleVaultClick;
    $('vault-table-view').onclick = handleVaultClick;
  }

  function handleVaultClick(e) {
    var checkBtn = e.target.closest('.prob-check-btn');
    if (checkBtn) {
      toggleSolve(checkBtn.dataset.slug);
      return;
    }
    var toggleIntuition = e.target.closest('.intuition-toggle');
    if (toggleIntuition) {
      var targetId = toggleIntuition.dataset.target;
      var drawer = $(targetId);
      if (drawer) drawer.classList.toggle('open');
      return;
    }
  }

  function toggleSolve(slug) {
    if (vaultDone[slug]) {
      delete vaultDone[slug];
      showToast('Marked problem as unsolved', '↩️');
    } else {
      vaultDone[slug] = 1;
      showToast('Problem marked as solved! Great work 🔥', '✓');
    }
    saveVaultDone();
    renderVaultProgress();
    renderVaultSidebar();
    renderVaultProblems();
  }

  function renderVaultProgress() {
    var total = getVaultProblems().length;
    var solved = 0;
    getVaultProblems().forEach(function(p) { if (vaultDone[p[2]]) solved++; });
    var pct = Math.round((solved / total) * 100);

    $('vault-pct-badge').textContent = pct + '%';
    $('vault-fill-bar').style.width = pct + '%';
    $('vault-count-solved').textContent = solved;
    $('vault-count-total').textContent = total;

    var titleEl = $('vault-prog-title');
    if (pct === 100) titleEl.textContent = 'Pattern Master 🏆';
    else if (pct >= 50) titleEl.textContent = 'Halfway There 🔥';
    else if (pct > 0) titleEl.textContent = 'In Progress 🚀';
    else titleEl.textContent = 'Ready to Start';
  }

  function renderVaultSidebar() {
    var aside = $('vault-sidebar');
    if (!aside) return;

    var categories = [['all', 'All Patterns']].concat(PATTERNS_DATA);
    var html = '';

    categories.forEach(function(cat) {
      var cId = cat[0], cName = cat[1];
      var count = 0, solved = 0;
      getVaultProblems().forEach(function(p) {
        if (cId === 'all' || p[0] === cId) {
          count++;
          if (vaultDone[p[2]]) solved++;
        }
      });
      var pct = count ? Math.round((solved / count) * 100) : 0;

      html += '<button class="vault-cat-btn ' + (vaultSelCat === cId ? 'active' : '') + '" data-cat="' + cId + '">' +
        '<div class="cat-btn-top"><span>' + cName + '</span><span class="sm num">' + solved + '/' + count + '</span></div>' +
        '<div class="cat-btn-bar"><i style="width:' + pct + '%"></i></div>' +
        '</button>';
    });

    aside.innerHTML = html;
    aside.querySelectorAll('.vault-cat-btn').forEach(function(btn) {
      btn.onclick = function() {
        vaultSelCat = this.dataset.cat;
        renderVaultSidebar();
        renderVaultProblems();
      };
    });
  }

  function renderVaultProblems() {
    var cardHtml = '', tableHtml = '', visibleCount = 0;
    var diffNames = ['', 'Easy', 'Medium', 'Hard'];

    getVaultProblems().forEach(function(p) {
      var cat = p[0], title = p[1], slug = p[2], diff = p[3], comps = p[4] || [], intuition = p[5] || '', problemUrl = p[6] || ('https://leetcode.com/problems/' + p[2] + '/');

      if (vaultSelCat !== 'all' && cat !== vaultSelCat) return;
      if (vaultSelDiff !== 'all' && diff !== parseInt(vaultSelDiff, 10)) return;
      if (vaultQuery && title.toLowerCase().indexOf(vaultQuery) < 0 && comps.join(' ').toLowerCase().indexOf(vaultQuery) < 0) return;

      visibleCount++;
      var isDone = !!vaultDone[slug];
      var diffClass = diff === 1 ? 'easy' : (diff === 2 ? 'med' : 'hard');

      // Card
      cardHtml += '<div class="prob-card ' + (isDone ? 'is-solved' : '') + '">' +
        '<div class="prob-card-header">' +
        '<div><span class="diff-pill ' + diffClass + '">' + diffNames[diff] + '</span></div>' +
        '<button class="prob-check-btn ' + (isDone ? 'checked' : '') + '" data-slug="' + slug + '" title="Mark Solved">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</button>' +
        '</div>' +
        '<a class="prob-title-link" href="' + escapeHTML(problemUrl) + '" target="_blank" rel="noopener">' +
        escapeHTML(title) +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>' +
        '</a>' +
        '<div class="prob-companies">' +
        comps.map(function(c) { return '<span class="comp-chip">' + escapeHTML(c) + '</span>'; }).join('') +
        '</div>' +
        '<div class="prob-card-footer">' +
        '<button class="intuition-toggle" data-target="drawer-' + slug + '">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
        'Key Intuition</button>' +
        '<a href="' + escapeHTML(problemUrl) + '" target="_blank" rel="noopener" class="sm" style="font-weight:600;color:var(--ac)">Solve ↗</a>' +
        '</div>' +
        '<div class="prob-intuition-drawer" id="drawer-' + slug + '"><b>Mental Model:</b> ' + escapeHTML(intuition) + '</div>' +
        '</div>';

      // Table Row
      tableHtml += '<tr class="' + (isDone ? 'is-solved' : '') + '">' +
        '<td><button class="prob-check-btn ' + (isDone ? 'checked' : '') + '" data-slug="' + slug + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></button></td>' +
        '<td><a href="' + escapeHTML(problemUrl) + '" target="_blank" rel="noopener" style="font-weight:600">' + escapeHTML(title) + '</a></td>' +
        '<td><span class="diff-pill ' + diffClass + '">' + diffNames[diff] + '</span></td>' +
        '<td>' + comps.map(escapeHTML).join(', ') + '</td>' +
        '<td><a href="' + escapeHTML(problemUrl) + '" target="_blank" rel="noopener" style="color:var(--ac);font-weight:600">Solve ↗</a></td>' +
        '</tr>';
    });

    $('vault-cards-view').innerHTML = cardHtml || '<p style="padding:40px;color:var(--mute);grid-column:1/-1;text-align:center">No problems found matching this filter.</p>';
    $('vault-table-tbody').innerHTML = tableHtml || '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--mute)">No problems found.</td></tr>';
    $('vault-shown-count').textContent = visibleCount;
  }

  // =========================================================================
  // 7. ALGORITHM BLUEPRINTS MODULE
  // =========================================================================
  var curBp = 'graph';
  var curLang = 'python';

  function initBlueprints() {
    renderBlueprint();

    document.querySelectorAll('.bp-tab-btn').forEach(function(btn) {
      btn.onclick = function() {
        document.querySelectorAll('.bp-tab-btn').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        curBp = this.dataset.bp;
        renderBlueprint();
      };
    });

    document.querySelectorAll('.bp-lang-btn').forEach(function(btn) {
      btn.onclick = function() {
        document.querySelectorAll('.bp-lang-btn').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        curLang = this.dataset.lang;
        renderBlueprint();
      };
    });

    var copyBtn = $('bp-copy-btn');
    if (copyBtn) {
      copyBtn.onclick = function() {
        var code = $('bp-code-block').textContent;
        navigator.clipboard.writeText(code).then(function() {
          showToast('Template copied to clipboard!', '📋');
        });
      };
    }
  }

  function renderBlueprint() {
    var data = BLUEPRINTS_DATA[curBp];
    if (!data) return;

    $('bp-badge').textContent = data.badge;
    $('bp-title').textContent = data.title;
    $('bp-desc').textContent = data.desc;
    $('bp-time').textContent = data.time;
    $('bp-space').textContent = data.space;

    var sigList = $('bp-signals');
    if (sigList) {
      sigList.innerHTML = data.signals.map(function(s) {
        return '<li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--ac)"><polyline points="20 6 9 17 4 12"/></svg>' + s + '</li>';
      }).join('');
    }

    $('bp-code-block').textContent = data.code[curLang] || '';
  }

  // =========================================================================
  // 8. CURATED ROADMAPS MODULE (DSA vs CP)
  // =========================================================================
  function initRoadmaps() {
    var dsaBtn = $('track-btn-dsa');
    var cpBtn = $('track-btn-cp');
    var dsaPanel = $('track-panel-dsa');
    var cpPanel = $('track-panel-cp');

    if (dsaBtn && cpBtn) {
      dsaBtn.onclick = function() {
        dsaBtn.classList.add('active'); cpBtn.classList.remove('active');
        dsaPanel.style.display = 'block'; cpPanel.style.display = 'none';
      };
      cpBtn.onclick = function() {
        cpBtn.classList.add('active'); dsaBtn.classList.remove('active');
        cpPanel.style.display = 'block'; dsaPanel.style.display = 'none';
      };
    }

    var compareBtn = $('btn-compare-toggle');
    var compareBox = $('compare-matrix-box');
    if (compareBtn && compareBox) {
      compareBtn.onclick = function() {
        compareBox.classList.toggle('show');
      };
    }

    setupRoadmapChecklist('dsa-timeline-container', 'topx_dsa_milestones', 'dsa-progress-bar', 'dsa-progress-txt', 'btn-reset-dsa', ROADMAP_DSA_PHASES, true);
    setupRoadmapChecklist('cp-timeline-container', 'topx_cp_milestones', 'cp-progress-bar', 'cp-progress-txt', 'btn-reset-cp', ROADMAP_CP_TIERS, false);
  }

  function setupRoadmapChecklist(containerId, storageKey, barId, txtId, resetBtnId, dataPhases, isDsa) {
    var container = $(containerId);
    if (!container) return;

    var track = isDsa ? 'dsa' : 'cp';
    var saved = roadmapSaved[track] || {};

    function save() {
      roadmapSaved[track] = saved;
      if (currentAuthUser) saveUserProgress({ roadmapProgress: (function() { var value = {}; value[track] = saved; return value; })() });
    }

    function renderCards() {
      var html = '';
      dataPhases.forEach(function(phase) {
        var badge = isDsa ? phase.phase : phase.tier;
        html += '<div class="timeline-card">' +
          '<div class="timeline-card-header">' +
          '<span class="phase-badge">' + badge + '</span>' +
          '<span class="sm">⏱️ ' + (phase.duration || phase.rating) + '</span>' +
          '</div>' +
          '<h3>' + phase.title + '</h3>' +
          '<p class="sm">' + phase.desc + '</p>' +
          '<div class="timeline-milestones-grid">';

        phase.milestones.forEach(function(m) {
          var isChecked = !!saved[m.id];
          html += '<div class="milestone-item ' + (isChecked ? 'completed' : '') + '" data-id="' + m.id + '">' +
            '<div class="milestone-checkbox"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>' +
            '<span>' + m.text + '</span>' +
            '</div>';
        });

        html += '</div>' +
          '<div class="sm" style="border-top:1px solid var(--line);padding-top:12px"><b>Target:</b> ' + phase.target + '</div>' +
          '</div>';
      });

      container.innerHTML = html;
      updateStats();

      container.querySelectorAll('.milestone-item').forEach(function(item) {
        item.onclick = function() {
          var mId = this.dataset.id;
          if (saved[mId]) {
            delete saved[mId];
          } else {
            saved[mId] = 1;
            showToast('Milestone achieved! 🚀', '✓');
          }
          save();
          renderCards();
        };
      });
    }

    function updateStats() {
      var total = 0;
      dataPhases.forEach(function(p) { total += p.milestones.length; });
      var doneCount = Object.keys(saved).length;
      var pct = total ? Math.round((doneCount / total) * 100) : 0;

      var bar = $(barId);
      var txt = $(txtId);
      if (bar) bar.style.width = pct + '%';
      if (txt) txt.textContent = doneCount + ' of ' + total + ' Milestones (' + pct + '%)';
    }

    var resetBtn = $(resetBtnId);
    if (resetBtn) {
      resetBtn.onclick = function() {
        if (confirm('Reset milestones for this trajectory?')) {
          saved = {};
          save();
          renderCards();
          showToast('Trajectory reset', '🔄');
        }
      };
    }

    renderCards();
  }

  // =========================================================================
  // 9. VISUALIZER LAB MODULE
  // =========================================================================
  function initVisualizerLab() {
    document.querySelectorAll('.lab-tab-btn').forEach(function(btn) {
      btn.onclick = function() {
        document.querySelectorAll('.lab-tab-btn').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        var targetLab = this.dataset.lab;

        document.querySelectorAll('.lab-display-card').forEach(function(card) {
          card.style.display = card.id === 'lab-card-' + targetLab ? 'block' : 'none';
        });

        setTimeout(function() {
          if (targetLab === 'pathfinding' && visualizerInstances.pathfindingLab) visualizerInstances.pathfindingLab.resize();
          if (targetLab === 'binsearch' && visualizerInstances.binarySearchLab) visualizerInstances.binarySearchLab.resize();
          if (targetLab === 'bubble' && visualizerInstances.bubbleSortLab) visualizerInstances.bubbleSortLab.resize();
        }, 50);
      };
    });
  }

  // =========================================================================
  // 10. MASTERCLASS GUIDES MODULE
  // =========================================================================
  function initGuides() {
    var container = $('guides-cards-grid');
    if (!container) return;

    container.innerHTML = GUIDES_DATA.map(function(g) {
      return '<div class="guide-card">' +
        '<div class="guide-meta"><span class="guide-tag">' + escapeHTML(g.type) + '</span><span class="guide-time">' + escapeHTML(g.time) + '</span></div>' +
        '<h4>' + escapeHTML(g.title) + '</h4>' +
        '<p>' + escapeHTML(g.desc) + '</p>' +
        '<a class="guide-link-btn" href="' + escapeHTML(g.link) + '" target="_blank" rel="noopener">' +
        'Explore Guide <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' +
        '</a>' +
        '</div>';
    }).join('');
  }

  // =========================================================================
  // 11. COMMAND PALETTE & SEARCH MODAL (Cmd+K / /)
  // =========================================================================
  function initCommandPalette() {
    var modalBackdrop = $('cmd-backdrop');
    var input = $('cmd-input');
    var resultsBox = $('cmd-results');

    function openModal() {
      if (!modalBackdrop) return;
      modalBackdrop.classList.add('open');
      input.value = '';
      renderResults('');
      setTimeout(function() { input.focus(); }, 50);
    }

    function closeModal() {
      if (!modalBackdrop) return;
      modalBackdrop.classList.remove('open');
    }

    // Trigger buttons
    var searchPill = $('search-pill-btn');
    if (searchPill) searchPill.onclick = openModal;

    // Keyboard shortcut (Cmd+K / Ctrl+K / /)
    window.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openModal();
      } else if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        e.preventDefault();
        openModal();
      } else if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) {
        closeModal();
      }
    });

    if (modalBackdrop) {
      modalBackdrop.onclick = function(e) {
        if (e.target === modalBackdrop) closeModal();
      };
    }

    input.oninput = function() {
      renderResults(this.value.trim().toLowerCase());
    };

    function renderResults(q) {
      var matches = [];

      // Problems
      PROBLEMS_DATA.forEach(function(p) {
        if (!q || p[1].toLowerCase().indexOf(q) > -1 || (p[4] || []).join(' ').toLowerCase().indexOf(q) > -1) {
          matches.push({
            type: 'Problem',
            icon: '🎯',
            title: p[1],
            sub: 'Curated Practice Vault · ' + (['', 'Easy', 'Medium', 'Hard'][p[3]]),
            action: function() { switchTab('vault'); }
          });
        }
      });

      // Blueprints
      Object.keys(BLUEPRINTS_DATA).forEach(function(k) {
        var bp = BLUEPRINTS_DATA[k];
        if (!q || bp.title.toLowerCase().indexOf(q) > -1) {
          matches.push({
            type: 'Blueprint',
            icon: '📋',
            title: bp.title,
            sub: 'Interview Pattern Template · ' + bp.badge,
            action: function() { switchTab('blueprints'); }
          });
        }
      });

      // Roadmaps
      if (!q || 'dsa interview roadmap competitive programming'.indexOf(q) > -1) {
        matches.push({
          type: 'Roadmap',
          icon: '🗺️',
          title: 'DSA vs Competitive Programming Trajectory',
          sub: 'Masterclass roadmaps with milestone checklists',
          action: function() { switchTab('roadmaps'); }
        });
      }

      // Visualizers
      if (!q || 'visualizer pathfinding binary search bubble sort 3d'.indexOf(q) > -1) {
        matches.push({
          type: 'Visualizer',
          icon: '🔬',
          title: '3D Algorithm Simulation Lab',
          sub: 'Interactive WebGL simulations for graph search & sorting',
          action: function() { switchTab('lab'); }
        });
      }

      // Leaderboard
      LEADERBOARD_DATA.slice(0, 10).forEach(function(s) {
        if (q && (s.n.toLowerCase().indexOf(q) > -1 || s.b.toLowerCase().indexOf(q) > -1)) {
          matches.push({
            type: 'Leaderboard',
            icon: '🏆',
            title: s.n,
            sub: s.b + ' · ' + s.s + ' solved · ' + s.k + 'd streak',
            action: function() { switchTab('leaderboard'); }
          });
        }
      });

      resultsBox.innerHTML = matches.slice(0, 8).map(function(item, idx) {
        return '<div class="cmd-item" data-idx="' + idx + '">' +
          '<div class="cmd-item-icon">' + item.icon + '</div>' +
          '<div class="cmd-item-info">' +
          '<div class="cmd-item-title">' + item.title + '</div>' +
          '<div class="cmd-item-sub">' + item.sub + '</div>' +
          '</div>' +
          '</div>';
      }).join('') || '<div style="padding:24px;text-align:center;color:var(--mute)">No matches found</div>';

      resultsBox.querySelectorAll('.cmd-item').forEach(function(el) {
        el.onclick = function() {
          var idx = +this.dataset.idx;
          closeModal();
          matches[idx].action();
        };
      });
    }
  }

  // =========================================================================
  // 12. PROFILE & CP HANDLES AUTO-SYNC MODULE
  // =========================================================================

  function initProfileAndAuth() {
    var modalBackdrop = $('profile-modal-backdrop');
    var openProfileLink = $('open-profile-modal-link');
    var openAuthLink = $('open-auth-modal-link');
    var closeBtn = $('modal-close-profile-btn');
    var tabProfileBtn = $('modal-tab-profile-btn');
    var tabAuthBtn = $('modal-tab-auth-btn');
    var profileView = $('modal-profile-view');
    var authView = $('modal-auth-view');

    function openModal(mode) {
      if (!modalBackdrop) return;
      modalBackdrop.classList.add('open');
      if (mode === 'auth') {
        tabProfileBtn.classList.remove('active');
        tabAuthBtn.classList.add('active');
        profileView.style.display = 'none';
        authView.style.display = 'block';
      } else {
        tabAuthBtn.classList.remove('active');
        tabProfileBtn.classList.add('active');
        authView.style.display = 'none';
        profileView.style.display = 'block';
      }
    }

    function closeModal() {
      if (modalBackdrop) modalBackdrop.classList.remove('open');
    }

    if (openProfileLink) openProfileLink.onclick = function() { closeAllDropdowns(); switchTab('profile'); closeModal(); updateProfilePage(); };
    if (openAuthLink) openAuthLink.onclick = function() { openModal('auth'); };
    if (closeBtn) closeBtn.onclick = closeModal;

    if (modalBackdrop) {
      modalBackdrop.onclick = function(e) {
        if (e.target === modalBackdrop) closeModal();
      };
    }

    if (tabProfileBtn && tabAuthBtn) {
      tabProfileBtn.onclick = function() { openModal('profile'); };
      tabAuthBtn.onclick = function() { openModal('auth'); };
    }

    // The secondary account modal uses the same server-backed auth API as the full-screen gate.
    var legacyAuthForm = $('form-auth-credentials');
    var legacyRegisterButton = $('btn-submit-register');
    async function submitLegacyAuth(mode) {
      var name = ($('auth-name-input') && $('auth-name-input').value || '').trim();
      var email = ($('auth-email-input') && $('auth-email-input').value || '').trim().toLowerCase();
      var password = $('auth-password-input') && $('auth-password-input').value || '';
      if (!email || !password || (mode === 'register' && !name)) return showToast('Complete all required fields first.', '⚠');
      if (password.length < 8) return showToast('Password must be at least 8 characters.', '⚠');
      var buttons = [$('btn-submit-login'), legacyRegisterButton].filter(Boolean);
      buttons.forEach(function(b){ b.disabled = true; });
      try {
        var response = await fetch(mode === 'register' ? '/api/auth/register' : '/api/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mode === 'register' ? { name: name, email: email, password: password } : { email: email, password: password })
        });
        var data = await response.json().catch(function(){ return {}; });
        if (!response.ok) throw new Error(data.error || 'Authentication failed.');
        if (!data.user || !data.user.id) throw new Error('Server returned an invalid session.');
        window.location.reload();
      } catch (err) { showToast(err.message || 'Could not reach the server.', '⚠'); }
      finally { buttons.forEach(function(b){ b.disabled = false; }); }
    }
    if (legacyAuthForm) legacyAuthForm.addEventListener('submit', function(e){ e.preventDefault(); submitLegacyAuth('login'); });
    if (legacyRegisterButton) legacyRegisterButton.onclick = function(){ submitLegacyAuth('register'); };

    // Avatar custom changer
    var btnChangeAvatar = $('btn-change-avatar');
    var avatarDrawer = $('avatar-input-drawer');
    var btnSaveAvatar = $('btn-save-custom-avatar');
    var customAvatarInput = $('custom-avatar-url-input');

    if (btnChangeAvatar && avatarDrawer) {
      btnChangeAvatar.onclick = function() {
        avatarDrawer.style.display = avatarDrawer.style.display === 'none' ? 'block' : 'none';
      };
    }

    if (btnSaveAvatar && customAvatarInput) {
      btnSaveAvatar.onclick = async function() {
        if (!currentAuthUser) return showToast('Sign in to update your profile.', '⚠');
        var url = customAvatarInput.value.trim();
        if (!/^https:\/\//i.test(url)) return showToast('Use a valid HTTPS image URL.', '⚠');
        if (!url) return;
        try { var r = await fetch('/api/user/profile/' + encodeURIComponent(currentAuthUser.id), {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({avatar:url})}); var d = await r.json(); if(!r.ok) throw new Error(d.error || 'Could not save profile.'); currentAuthUser = Object.assign(currentAuthUser,d.user); updateUserUI(); avatarDrawer.style.display = 'none'; showToast('Profile picture saved.', '✓'); } catch(e) { showToast(e.message || 'Could not save profile.', '⚠'); }
      };
    }

    // Save Handles Only
    var btnSaveHandles = $('btn-save-handles-only');
    if (btnSaveHandles) {
      btnSaveHandles.onclick = async function() {
        if (!currentAuthUser) return showToast('Sign in to save your platform handles.', '⚠');
        var handles = {leetcode:($('input-handle-leetcode').value||'').trim(),codeforces:($('input-handle-codeforces').value||'').trim(),codechef:($('input-handle-codechef').value||'').trim()};
        try { var r=await fetch('/api/user/handles/'+encodeURIComponent(currentAuthUser.id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(handles)}); var d=await r.json(); if(!r.ok) throw new Error(d.error||'Could not save handles.'); currentAuthUser=Object.assign(currentAuthUser,d.user); showToast('Platform handles saved to your account.', '✓'); }
        catch(e) { showToast(e.message||'Could not save handles.', '⚠'); }
      };
    }

    // Sync All CP Data Directly
    var btnSyncAll = $('btn-sync-all-cp-modal');
    if (btnSyncAll) {
      btnSyncAll.onclick = async function() {
        if (!currentAuthUser) return showToast('Sign in before syncing platform stats.', '⚠');
        btnSyncAll.disabled = true;
        btnSyncAll.textContent = '⏳ Syncing APIs...';
        showToast('Connecting to Codeforces, LeetCode & CodeChef APIs...', '🔄');

        var lc = ($('input-handle-leetcode').value || '').trim();
        var cf = ($('input-handle-codeforces').value || '').trim();
        var cc = ($('input-handle-codechef').value || '').trim();

        try {
          var saveRes = await fetch('/api/user/handles/' + encodeURIComponent(currentAuthUser.id), {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({leetcode:lc,codeforces:cf,codechef:cc})});
          var saveData = await saveRes.json(); if(!saveRes.ok) throw new Error(saveData.error || 'Could not save handles.');
          if (saveData.user) currentAuthUser = Object.assign(currentAuthUser, saveData.user);
          var res = await fetch('/api/sync/all/' + encodeURIComponent(currentAuthUser.id), { method: 'POST' });
          var data = await res.json(); if(!res.ok) throw new Error(data.error || 'Platform sync failed.');
          if (data.user) currentAuthUser = Object.assign(currentAuthUser, data.user);
          updateUserUI();
          renderDashboardStats();
          fetch('/api/leaderboard').then(function(r){return r.json();}).then(function(lb){LEADERBOARD_DATA.splice(0, LEADERBOARD_DATA.length, ...(lb.members || [])); window.dispatchEvent(new Event('topx:leaderboard-updated'));}).catch(function(){});
          if (data.errors && data.errors.length) showToast('Some APIs could not sync: ' + data.errors.join('; '), '⚠');
          else showToast('Platform stats refreshed from available APIs.', '✓');
        } catch (err) { showToast(err.message || 'Sync failed. Try again later.', '⚠'); }
        finally { btnSyncAll.disabled = false; btnSyncAll.textContent = '⚡ Sync All Data Directly'; }
      };
    }

    // Google OAuth remains disabled until a verified provider ID token is configured.
    var btnGoogle = $('btn-login-google');
    if (btnGoogle) btnGoogle.onclick = function(){ showToast('Google OAuth is not configured. Use email and password.', '⚠'); };

    // Authentication is handled by the account gate; do not create client-only sessions here.
    updateUserUI();
  }

  function initTopXAuthGate() {
    var gate = document.getElementById('login-gate');
    var form = document.getElementById('gate-auth-form');
    var nameInput = document.getElementById('gate-name');
    var emailInput = document.getElementById('gate-email');
    var passwordInput = document.getElementById('gate-password');
    var submit = document.getElementById('gate-submit-btn');
    var signInTab = document.getElementById('login-tab-signin');
    var signUpTab = document.getElementById('login-tab-signup');
    var toggle = document.getElementById('gate-toggle-link');
    var hint = document.getElementById('gate-toggle-hint');
    var nameField = document.getElementById('gate-name-field');
    var demo = document.getElementById('gate-demo-btn');
    var google = document.getElementById('gate-btn-google');
    if (!gate || !form) return;
    var mode = 'login';
    function setMode(next) {
      mode = next;
      signInTab.classList.toggle('active', mode === 'login');
      signUpTab.classList.toggle('active', mode === 'register');
      nameField.style.display = mode === 'register' ? 'block' : 'none';
      nameInput.required = mode === 'register';
      passwordInput.autocomplete = mode === 'register' ? 'new-password' : 'current-password';
      submit.querySelector('span').textContent = mode === 'register' ? 'Create Account' : 'Sign In';
      hint.innerHTML = mode === 'register' ? 'Already have an account? <a href="javascript:void(0)" id="gate-toggle-link">Sign in</a>' : 'Don\'t have an account? <a href="javascript:void(0)" id="gate-toggle-link">Create one</a>';
      document.getElementById('gate-toggle-link').onclick = function(){ setMode(mode === 'login' ? 'register' : 'login'); };
    }
    signInTab.onclick = function(){ setMode('login'); };
    signUpTab.onclick = function(){ setMode('register'); };
    if (toggle) toggle.onclick = function(){ setMode('register'); };
    setMode('login');
    var headerLogout = document.getElementById('header-logout-btn');
    if (headerLogout) headerLogout.onclick = function(){
      fetch('/api/auth/logout', { method: 'POST' })
        .then(function(response) { if (!response.ok) throw new Error('Could not sign out.'); window.location.reload(); })
        .catch(function(err) { showToast(err.message || 'Could not sign out.', '⚠'); });
    };
    function enter(user) {
      if (!user || !user.id) throw new Error('Server returned an invalid session.');
      window.location.hash = '#dashboard';
      window.location.reload();
    }
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      var email = emailInput.value.trim().toLowerCase();
      var password = passwordInput.value;
      var name = nameInput.value.trim();
      if (!email || !password || (mode === 'register' && !name)) return showToast('Please complete all required fields.', '⚠');
      if (password.length < 8) return showToast('Password must be at least 8 characters.', '⚠');
      submit.disabled = true;
      var original = submit.querySelector('span').textContent;
      submit.querySelector('span').textContent = mode === 'register' ? 'Creating account…' : 'Signing in…';
      try {
        var response = await fetch(mode === 'register' ? '/api/auth/register' : '/api/auth/login', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify(mode === 'register' ? {name:name,email:email,password:password} : {email:email,password:password})
        });
        var data = await response.json().catch(function(){ return {}; });
        if (!response.ok) throw new Error(data.error || 'Authentication failed.');
        enter(data.user);
      } catch(err) { showToast(err.message || 'Could not reach the server.', '⚠'); }
      finally { submit.disabled = false; submit.querySelector('span').textContent = original; }
    });
    if (demo) { demo.style.display = 'none'; }
    if (google) google.onclick = function(){ showToast('Google Sign-In is not configured yet. Add Google OAuth credentials before enabling it.', '⚠'); };
    // Keep the app hidden until PostgreSQL confirms the cookie session.
    document.body.classList.add('auth-locked');
    gate.style.display = 'flex';
    fetch('/api/auth/me')
        .then(function(response) { if (!response.ok) { var error = new Error(response.status === 401 ? 'Session expired' : 'Database unavailable.'); error.status = response.status; throw error; } return response.json(); })
        .then(function(data) {
          if (!data.user || !data.user.id) throw new Error('Invalid session');
          currentAuthUser = data.user;
          document.body.classList.remove('auth-locked');
          document.body.classList.add('authenticated');
          gate.style.display = 'none';
          loadUser('A');
          updateUserUI();
          refreshDailyTasks().then(renderDailyTasks).catch(function(err){ showToast(err.message || 'Could not load daily tasks.', '⚠'); });
          loadTopXProStatus().catch(function(){});
          loadUserProgress(data.user.id).catch(function(err) { showToast(err.message || 'Could not load account progress.', '⚠'); });
        })
        .catch(function(err) {
          currentAuthUser = null;
          document.body.classList.remove('authenticated'); document.body.classList.add('auth-locked'); gate.style.display = 'flex';
          if (err.status !== 401) showToast(err.message || 'Could not connect to the database.', '⚠');
        });
  }

  function updateUserUI() {
    var u = currentAuthUser;
    if (!u) return;
    if ($('modal-user-name')) $('modal-user-name').textContent = u.name || 'Member';
    if ($('header-streak-num')) $('header-streak-num').textContent = String(u.currentStreak || 0);
    if ($('dash-greeting-time')) {
      var h = new Date().getHours();
      $('dash-greeting-time').textContent = (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + ', ' + (u.name || 'Member') + '.';
    }
    if ($('modal-user-email')) $('modal-user-email').textContent = u.email;
    updateProfilePage();
    if ($('menu-profile-header')) $('menu-profile-header').textContent = u.name + ([u.branch, u.section].filter(Boolean).join(' · ') ? ' · ' + [u.branch, u.section].filter(Boolean).join(' · ') : '');
    if ($('input-handle-leetcode')) $('input-handle-leetcode').value = u.handles && u.handles.leetcode || '';
    if ($('input-handle-codeforces')) $('input-handle-codeforces').value = u.handles && u.handles.codeforces || '';
    if ($('input-handle-codechef')) $('input-handle-codechef').value = u.handles && u.handles.codechef || '';

    var avatarImg = $('modal-user-avatar-img');
    if (avatarImg) {
      if (u.avatar && /^https:\/\//i.test(u.avatar)) avatarImg.src = u.avatar;
      else avatarImg.removeAttribute('src');
    }

    var headerAvatar = $('header-user-avatar');
    if (headerAvatar) {
      if (u.avatar && /^https:\/\//i.test(u.avatar)) {
        headerAvatar.style.backgroundImage = 'url(' + u.avatar + ')';
        headerAvatar.style.backgroundSize = 'cover';
        headerAvatar.textContent = '';
      } else {
        headerAvatar.style.backgroundImage = 'none';
        headerAvatar.textContent = String(u.name || 'M').trim().charAt(0).toUpperCase();
      }
    }

    var proBadge = $('modal-user-pro-badge');
    if (proBadge) {
      proBadge.textContent = u.isPro ? '⚡ Top-X Pro Member' : 'Top-X Member';
      proBadge.className = 'profile-badge-tag ' + (u.isPro ? 'is-pro' : '');
    }

    // Stats
    var s = u.syncedStats;
    if ($('lc-stat-solved')) $('lc-stat-solved').textContent = s && s.leetcode ? Number(s.leetcode.solved || 0).toLocaleString() : '—';
    if ($('lc-stat-ratio')) $('lc-stat-ratio').textContent = s && s.leetcode ? [s.leetcode.easy || 0, s.leetcode.medium || 0, s.leetcode.hard || 0].join(' / ') : 'Connect handle';
    if ($('lc-stat-rating')) $('lc-stat-rating').textContent = s && s.leetcode && s.leetcode.rating ? Number(s.leetcode.rating).toLocaleString() : '—';
    if ($('cf-stat-rating')) $('cf-stat-rating').textContent = s && s.codeforces ? Number(s.codeforces.rating || 0).toLocaleString() : '—';
    if ($('cf-stat-rank')) $('cf-stat-rank').textContent = s && s.codeforces ? (s.codeforces.rank || 'Unrated') : 'Connect handle';
    if ($('cf-stat-max')) $('cf-stat-max').textContent = s && s.codeforces ? Number(s.codeforces.maxRating || 0).toLocaleString() : '—';
    if ($('cc-stat-rating')) $('cc-stat-rating').textContent = s && s.codechef ? Number(s.codechef.rating || 0).toLocaleString() : '—';
    if ($('cc-stat-stars')) $('cc-stat-stars').textContent = s && s.codechef ? (s.codechef.stars || 'Unrated') : 'Connect handle';
    if ($('cc-stat-rank')) $('cc-stat-rank').textContent = s && s.codechef && s.codechef.globalRank ? '#' + Number(s.codechef.globalRank).toLocaleString() : '—';
  }

  // =========================================================================
  // MEMBER PROFILE PAGE: account editing + real public platform API sync
  // =========================================================================
  function profileApi(path, options) {
    options = options || {};
    options.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    return fetch(path, options).then(async function(response) {
      var data = await response.json().catch(function(){ return {}; });
      if (!response.ok) { var error = new Error(data.error || ('Request failed (' + response.status + ')')); error.data = data; throw error; }
      return data;
    });
  }

  function saveUserProgress(payload) {
    if (!currentAuthUser) return Promise.resolve();
    var userId = currentAuthUser.id;
    progressWriteQueue = progressWriteQueue.catch(function() {}).then(async function() {
      var response = await fetch('/api/user/progress/' + encodeURIComponent(userId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await response.json().catch(function() { return {}; });
      if (!response.ok) throw new Error(data.error || 'Could not save account progress.');
    }).catch(function(err) {
      showToast(err.message || 'Could not save account progress.', '⚠');
    });
    return progressWriteQueue;
  }

  function loadUserProgress(userId) {
    return fetch('/api/user/progress/' + encodeURIComponent(userId))
      .then(async function(response) {
        var data = await response.json().catch(function() { return {}; });
        if (!response.ok) throw new Error(data.error || 'Could not load account progress.');
        roadmapSaved = data.roadmapProgress || { dsa: {}, cp: {} };
        vaultDone = {};
        (Array.isArray(data.solvedVaultProblemIds) ? data.solvedVaultProblemIds : []).forEach(function(id) { vaultDone[id] = 1; });
        initRoadmaps();
        renderVaultProgress();
        renderVaultSidebar();
        renderVaultProblems();
        return data;
      });
  }

  function updateProfilePage() {
    var u = currentAuthUser;
    if (!u) return;
    function set(id, value) { var el = $(id); if (el) el.textContent = value == null || value === '' ? '—' : String(value); }
    set('page-profile-name', u.name || 'Member');
    set('page-profile-email', u.email || '');
    set('page-profile-name-input', u.name || '');
    if ($('page-profile-name-input')) $('page-profile-name-input').value = u.name || '';
    if ($('page-profile-branch-input')) $('page-profile-branch-input').value = u.branch || '';
    if ($('page-profile-section-input')) $('page-profile-section-input').value = u.section || '';
    var avatar = $('page-profile-avatar');
    if (avatar) {
      if (u.avatar && /^https:\/\//i.test(u.avatar)) { avatar.style.backgroundImage = 'url("' + u.avatar.replace(/["\\]/g, '') + '")'; avatar.style.backgroundSize = 'cover'; avatar.textContent = ''; }
      else { avatar.style.backgroundImage = 'none'; avatar.textContent = String(u.name || 'M').trim().charAt(0).toUpperCase(); }
    }
    var handles = u.handles || {};
    ['leetcode','codeforces','codechef'].forEach(function(platform){ var el=$('page-handle-'+platform); if(el && document.activeElement !== el) el.value=handles[platform]||''; });
    var stats = u.syncedStats || {}, lc=stats.leetcode, cf=stats.codeforces, cc=stats.codechef;
    set('page-lc-solved', lc ? Number(lc.solved||0).toLocaleString() : '—');
    set('page-lc-breakdown', lc ? [lc.easy||0,lc.medium||0,lc.hard||0].join(' / ') : '—');
    set('page-lc-rank', lc && lc.ranking ? Number(lc.ranking).toLocaleString() : '—');
    set('page-cf-rating', cf ? Number(cf.rating||0).toLocaleString() : '—');
    set('page-cf-rank', cf ? (cf.rank||'Unrated') : '—');
    set('page-cf-max', cf ? Number(cf.maxRating||0).toLocaleString() : '—');
    set('page-cc-rating', cc ? Number(cc.rating||0).toLocaleString() : '—');
    set('page-cc-stars', cc ? (cc.stars||'Unrated') : '—');
    set('page-cc-rank', cc && cc.globalRank ? Number(cc.globalRank).toLocaleString() : '—');
    set('page-lc-status', lc ? 'Live data loaded for ' + (lc.username||handles.leetcode) : (handles.leetcode ? 'Not synced yet' : 'Connect a username'));
    set('page-cf-status', cf ? 'Live data loaded for ' + (cf.handle||handles.codeforces) : (handles.codeforces ? 'Not synced yet' : 'Connect a handle'));
    set('page-cc-status', cc ? 'Live data loaded for ' + (cc.handle||handles.codechef) : (handles.codechef ? 'Not synced yet' : 'Connect a username'));
    set('page-profile-last-sync', u.lastSyncedAt ? 'Last successful sync: ' + new Date(u.lastSyncedAt).toLocaleString() : 'No successful sync recorded yet.');
  }

  function initProfilePage() {
    var photoInput = $('page-profile-photo-file');
    if (photoInput && !photoInput.dataset.bound) {
      photoInput.dataset.bound = '1';
      photoInput.addEventListener('change', function() {
        var file = photoInput.files && photoInput.files[0];
        if (!file) return;
        if (!file.type || !file.type.startsWith('image/')) { showToast('Choose an image file.', '⚠'); photoInput.value=''; return; }
        if (file.size > 2 * 1024 * 1024) { showToast('Image must be 2 MB or smaller.', '⚠'); photoInput.value=''; return; }
        var reader = new FileReader();
        reader.onload = async function() {
          try {
            if (!currentAuthUser) throw new Error('Sign in to update your profile picture.');
            var data = await profileApi('/api/user/profile/' + encodeURIComponent(currentAuthUser.id), {method:'PUT', body:JSON.stringify({avatar:reader.result})});
            currentAuthUser = Object.assign({}, currentAuthUser, data.user);
            updateUserUI(); updateProfilePage(); showToast('Profile picture updated.', '✓');
          } catch(err) { showToast(err.message || 'Could not update picture.', '⚠'); }
          finally { photoInput.value=''; }
        };
        reader.readAsDataURL(file);
      });
    }

    var form = $('page-profile-form');
    if (form) form.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (!currentAuthUser) return showToast('Please sign in first.', '⚠');
      var button=$('page-profile-save'); button.disabled=true;
      try {
        var data=await profileApi('/api/user/profile/'+encodeURIComponent(currentAuthUser.id), {method:'PUT',body:JSON.stringify({name:$('page-profile-name-input').value.trim(),branch:$('page-profile-branch-input').value,section:$('page-profile-section-input').value})});
        currentAuthUser=Object.assign({},currentAuthUser,data.user); updateUserUI(); updateProfilePage(); showToast('Profile saved to your account.', '✓');
      } catch(err) { showToast(err.message || 'Could not save profile.', '⚠'); }
      finally { button.disabled=false; }
    });
    var sync=$('page-profile-sync');
    if(sync) sync.addEventListener('click', async function() {
      if(!currentAuthUser) return showToast('Please sign in first.', '⚠');
      var handles={leetcode:$('page-handle-leetcode').value.trim(),codeforces:$('page-handle-codeforces').value.trim(),codechef:$('page-handle-codechef').value.trim()};
      if(!handles.leetcode && !handles.codeforces && !handles.codechef) return showToast('Enter at least one real platform username.', '⚠');
      sync.disabled=true; sync.textContent='Syncing live APIs…';
      var status=$('page-profile-sync-status'); if(status) status.textContent='Saving handles and requesting live data from platform APIs…';
      try {
        var saved=await profileApi('/api/user/handles/'+encodeURIComponent(currentAuthUser.id),{method:'PUT',body:JSON.stringify(handles)});
        currentAuthUser=Object.assign({},currentAuthUser,saved.user);
        var result=await profileApi('/api/sync/all/'+encodeURIComponent(currentAuthUser.id),{method:'POST',body:JSON.stringify({})});
        currentAuthUser=Object.assign({},currentAuthUser,result.user);
        updateUserUI(); updateProfilePage(); renderDashboardStats();
        if(status) status.textContent=(result.errors && result.errors.length) ? 'Some platforms did not respond: '+result.errors.join('; ') : 'Live data synced successfully from connected platforms.';
        showToast((result.errors && result.errors.length) ? 'Sync finished with some API errors. See each platform status.' : 'Live platform data synced successfully.', (result.errors && result.errors.length) ? '⚠' : '✓');
      } catch(err) {
        if (err.data && err.data.user) { currentAuthUser=Object.assign({},currentAuthUser,err.data.user); updateUserUI(); updateProfilePage(); }
        var detail = err.data && err.data.details && err.data.details.length ? ' Details: ' + err.data.details.join('; ') : '';
        if(status) status.textContent='Sync failed: '+(err.message||'Unknown error')+detail+'. Check the handles and retry; provider outages can be temporary.';
        showToast((err.message || 'Live sync failed.') + (detail ? ' See profile for details.' : ''), '⚠');
      }
      finally { sync.disabled=false; sync.textContent='↻ Save & sync live data'; }
    });
    var logout=$('page-profile-logout');
    if(logout) logout.addEventListener('click', function(){
      fetch('/api/auth/logout', { method: 'POST' }).then(function(response) {
        if (!response.ok) throw new Error('Could not sign out.');
        currentAuthUser = null; window.location.hash='#dashboard'; window.location.reload();
      }).catch(function(err) { showToast(err.message || 'Could not sign out.', '⚠'); });
    });
  }

  // =========================================================================
  // 13. DAILY MEMBER TASKS MODULE
  // =========================================================================
  var dailyTasksList = [
    {
      id: 'task-1',
      title: 'LeetCode Daily: Longest Palindromic Substring',
      platform: 'LeetCode',
      difficulty: 'Medium',
      points: 50,
      url: 'https://leetcode.com/problems/longest-palindromic-substring/',
      isCompleted: false
    },
    {
      id: 'task-2',
      title: 'Codeforces Problem: 1840C - Ski Resort',
      platform: 'Codeforces',
      difficulty: '1100 Rating',
      points: 75,
      url: 'https://codeforces.com/problemset/problem/1840/C',
      isCompleted: false
    },
    {
      id: 'task-3',
      title: 'CodeChef Drill: LUCKFOUR (Lucky Four)',
      platform: 'CodeChef',
      difficulty: '510 Rating',
      points: 40,
      url: 'https://www.codechef.com/problems/LUCKFOUR',
      isCompleted: true
    }
  ];

  async function initDailyTasks() {
    try { await refreshDailyTasks(); } catch (_) {}
    renderDailyTasks();

    if (window.__topxTaskVerificationTimer) window.clearInterval(window.__topxTaskVerificationTimer);
    window.__topxTaskVerificationTimer = window.setInterval(function() {
      if (document.visibilityState === 'visible' && currentAuthUser && currentAuthUser.id) {
        refreshDailyTasks().then(renderDailyTasks).catch(function(){});
      }
    }, 120000);

    var btnSyncTasks = $('btn-sync-all-tasks');
    if (btnSyncTasks) {
      btnSyncTasks.onclick = async function() { btnSyncTasks.disabled=true; try { await refreshDailyTasks(); renderDailyTasks(); showToast('Task list refreshed. Submissions are checked automatically against your linked platform account.', '✓'); } catch(e) { showToast(e.message||'Could not refresh tasks.', '⚠'); } finally { btnSyncTasks.disabled=false; } };
    }
  }

  async function refreshDailyTasks() {
    if (!currentAuthUser || !currentAuthUser.id) return;
    var userId = encodeURIComponent(currentAuthUser.id);
    var verifyResponse = await fetch('/api/tasks/verify-all/' + userId, { method: 'POST' });
    var verifyData = await verifyResponse.json().catch(function(){ return {}; });
    // Still load task cards if one platform is temporarily unavailable; no task
    // is marked complete unless the server returns verified=true.
    var response = await fetch('/api/tasks/daily/' + userId);
    var data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load tasks.');
    dailyTasksList = (data.tasks || []).map(function(t){ return Object.assign({},t,{isCompleted:!!t.isCompleted}); });
    if (verifyResponse.ok && verifyData.newlyVerified > 0) showToast(verifyData.newlyVerified + ' submission(s) automatically verified.', '✓');
    else if (!verifyResponse.ok) showToast(verifyData.error || 'Could not verify submissions right now.', '⚠');
  }

  function renderDailyTasks() {
    var grid = $('tasks-cards-grid');
    if (!grid) return;

    var doneCount = 0, totalXP = 0;
    grid.innerHTML = dailyTasksList.map(function(task) {
      if (task.isCompleted) doneCount++;
      if (task.isCompleted) totalXP += Number(task.points || 0);

      return '<div class="task-card ' + (task.isCompleted ? 'completed' : '') + '">' +
        '<div class="task-card-top">' +
        '<span class="task-plat-badge ' + escapeHTML(task.platform) + '">' + escapeHTML(task.platform) + '</span>' +
        '<span class="task-points-pill">+' + task.points + ' XP</span>' +
        '</div>' +
        '<h4>' + escapeHTML(task.title) + '</h4>' +
        '<p class="sm" style="margin-bottom:16px">Difficulty: <b>' + escapeHTML(task.difficulty) + '</b></p>' +
        '<div class="task-card-footer">' +
        '<a href="' + escapeHTML(task.url) + '" target="_blank" rel="noopener" class="btn-link" style="font-size:12.5px">Solve on Platform ↗</a>' +
        (task.isCompleted ?
          '<span class="sm" style="color:var(--easy);font-weight:600">✓ Accepted submission verified</span>' :
          '<span class="sm" style="color:var(--muted)">Waiting for verified submission</span>') +
        '</div>' +
        '</div>';
    }).join('');

    if ($('tasks-done-stat')) $('tasks-done-stat').textContent = doneCount + ' / ' + dailyTasksList.length;
    if ($('tasks-xp-stat')) $('tasks-xp-stat').textContent = totalXP + ' XP';
    if ($('tasks-streak-stat')) $('tasks-streak-stat').textContent = String(currentAuthUser && currentAuthUser.currentStreak || 0) + ' days';
    if ($('nav-tasks-count')) $('nav-tasks-count').textContent = dailyTasksList.length - doneCount;


  }

  // =========================================================================
  // 14. TOP-X PRO (40 CODECHEF 500-RATED CHALLENGES)
  // =========================================================================
  var codechef40Problems = [
    { code: 'FLOW001', name: 'Number Mirror', rating: 480, isSolved: false },
    { code: 'START01', name: 'Number Mirror II', rating: 490, isSolved: false },
    { code: 'LUCKFOUR', name: 'Lucky Four', rating: 510, isSolved: false },
    { code: 'INTEST', name: 'Enormous Input Test', rating: 520, isSolved: false },
    { code: 'FSQRT', name: 'Finding Square Roots', rating: 495, isSolved: false },
    { code: 'CIELRCPT', name: 'Ciel and Receipt', rating: 530, isSolved: false },
    { code: 'HS08TEST', name: 'ATM', rating: 485, isSolved: false },
    { code: 'FLOW006', name: 'Sum of Digits', rating: 500, isSolved: false },
    { code: 'FLOW002', name: 'Find Remainder', rating: 480, isSolved: false },
    { code: 'FLOW004', name: 'First and Last Digit', rating: 505, isSolved: false },
    { code: 'FLOW007', name: 'Reverse The Number', rating: 515, isSolved: false },
    { code: 'CHOPRT', name: 'Chef And Operators', rating: 490, isSolved: false },
    { code: 'AMR15A', name: 'Mahasena', rating: 525, isSolved: false },
    { code: 'REMISS', name: 'Chef and Remissness', rating: 510, isSolved: false },
    { code: 'TLG', name: 'The Lead Game', rating: 540, isSolved: false },
    { code: 'DIFFSUM', name: 'Sum OR Difference', rating: 475, isSolved: false },
    { code: 'DECINC', name: 'Decrement OR Increment', rating: 480, isSolved: false },
    { code: 'PALL01', name: 'The Block Game', rating: 510, isSolved: false },
    { code: 'FLOW010', name: 'Id and Ship', rating: 490, isSolved: false },
    { code: 'FLOW013', name: 'Valid Triangles', rating: 505, isSolved: false },
    { code: 'FLOW017', name: 'Second Largest', rating: 515, isSolved: false },
    { code: 'FLOW018', name: 'Small Factorial', rating: 535, isSolved: false },
    { code: 'FLOW008', name: 'Servant', rating: 495, isSolved: false },
    { code: 'FLOW009', name: 'Total Expenses', rating: 510, isSolved: false },
    { code: 'FLOW011', name: 'Gross Salary', rating: 520, isSolved: false },
    { code: 'FLOW014', name: 'Grade The Steel', rating: 530, isSolved: false },
    { code: 'FLOW016', name: 'GCD and LCM', rating: 525, isSolved: false },
    { code: 'PRB01', name: 'Primality Test', rating: 540, isSolved: false },
    { code: 'LAPIN', name: 'Lapindromes', rating: 550, isSolved: false },
    { code: 'PPSUM', name: 'Puppy and Sum', rating: 515, isSolved: false },
    { code: 'HEADBOB', name: 'Tanu and Head-bob', rating: 520, isSolved: false },
    { code: 'TWOSTR', name: 'Chef and the Wildcard', rating: 535, isSolved: false },
    { code: 'TRISQ', name: 'Fit Squares in Triangle', rating: 545, isSolved: false },
    { code: 'VOWELTB', name: 'Vowel or Consonant', rating: 470, isSolved: false },
    { code: 'AREAPERI', name: 'Area OR Perimeter', rating: 490, isSolved: false },
    { code: 'HOWMANY', name: 'How many digits do I have', rating: 500, isSolved: false },
    { code: 'CANDY123', name: 'Bear and Candies 123', rating: 530, isSolved: false },
    { code: 'COPS', name: 'Cops and the Thief Devu', rating: 540, isSolved: false },
    { code: 'FRUITS', name: 'Chef and Fruits', rating: 510, isSolved: false },
    { code: 'CHN09', name: 'Malvika is peculiar', rating: 505, isSolved: false }
  ];

  async function initTopXPro() {
    if (currentAuthUser) { try { await loadTopXProStatus(); } catch(e) { renderTopXPro(); } }
    else renderTopXPro();

    var btnVerifyPro = $('btn-verify-pro-now');
    if (btnVerifyPro) {
      btnVerifyPro.onclick = async function() {
        btnVerifyPro.disabled=true;
        try { var r=await fetch('/api/topx-pro/verify/'+encodeURIComponent(currentAuthUser.id),{method:'POST'}); var d=await r.json(); if(!r.ok)throw new Error(d.error||'Could not submit the verification request.'); currentAuthUser.isPro=!!d.isPro; currentAuthUser.proVerificationStatus=d.verificationStatus || 'pending'; updateUserUI(); await loadTopXProStatus(); showToast(d.message||'Verification request submitted.','✓'); }
        catch(e){showToast(e.message||'CodeChef submission verification may be unavailable if the provider does not expose per-problem accepted data.','⚠');} finally {btnVerifyPro.disabled=false;}
      };
    }
  }

  async function loadTopXProStatus() {
    if (!currentAuthUser || !currentAuthUser.id) return;
    var r=await fetch('/api/topx-pro/status/'+encodeURIComponent(currentAuthUser.id)); var d=await r.json(); if(!r.ok)throw new Error(d.error||'Could not load Pro status.');
    currentAuthUser.isPro=!!d.isPro; currentAuthUser.proVerificationStatus=d.verificationStatus || 'not_requested'; codechef40Problems.forEach(function(p){var found=(d.problems||[]).find(function(x){return x.code===p.code;});p.isSolved=!!(found&&found.isSolved);}); renderTopXPro(); updateUserUI();
  }

  function renderTopXPro() {
    var grid = $('cc-problems-grid');
    if (!grid) return;

    var solvedCount = codechef40Problems.filter(function(p) { return p.isSolved; }).length;
    var pct = Math.round((solvedCount / 40) * 100);

    if ($('pro-progress-count')) $('pro-progress-count').textContent = solvedCount + ' / 40 Completed (' + pct + '%)';
    if ($('pro-progress-fill')) $('pro-progress-fill').style.width = pct + '%';

    var statusBadge = $('pro-status-badge');
    if (statusBadge) {
      if (currentAuthUser && currentAuthUser.isPro) {
        statusBadge.textContent = '🏆 Top-X Pro Active · Admin approved';
        statusBadge.style.color = 'var(--easy)';
      } else if (currentAuthUser && currentAuthUser.proVerificationStatus === 'pending') {
        statusBadge.textContent = 'Automatic verification checks your linked platform submissions';
        statusBadge.style.color = 'var(--ac)';
      } else {
        statusBadge.textContent = 'Problem completion is verified against the connected CodeChef account when per-problem data is available';
        statusBadge.style.color = 'var(--ac)';
      }
    }
    var verifyButton = $('btn-verify-pro-now');
    if (verifyButton) { verifyButton.textContent = currentAuthUser && currentAuthUser.proVerificationStatus === 'pending' ? 'Request Pending Review' : currentAuthUser && currentAuthUser.isPro ? 'Top-X Pro Active' : 'Sync CodeChef verification'; verifyButton.disabled = !!(currentAuthUser && (currentAuthUser.isPro || currentAuthUser.proVerificationStatus === 'pending')); }

    grid.innerHTML = codechef40Problems.map(function(prob) {
      return '<div class="cc-problem-item ' + (prob.isSolved ? 'solved' : '') + '">' +
        '<div class="cc-item-left">' +
        '<div class="cc-check-dot">✓</div>' +
        '<div class="cc-item-info">' +
        '<b>' + prob.code + '</b>' +
        '<span>' + prob.name + ' · ' + prob.rating + ' Rating</span>' +
        '</div>' +
        '</div>' +
        '<a href="https://www.codechef.com/problems/' + prob.code + '" target="_blank" rel="noopener" class="sm" style="color:var(--ac);font-weight:600">Solve ↗</a>' +
        '</div>';
    }).join('');
  }

  // =========================================================================
  // 15. SECURE ADMIN CONSOLE MODULE
  // =========================================================================
  var isAdminAuthenticated = false; window.topxIsAdminAuthenticated = false; if (window.topxSyncAdminNavVisibility) window.topxSyncAdminNavVisibility();
  var adminSessionToken = null;
  async function adminRequest(url, options) {
    options = options || {}; options.headers = Object.assign({}, options.headers || {}, { 'Content-Type': 'application/json' });
    options.credentials = 'same-origin';
    var response = await fetch(url, options); var data = await response.json().catch(function(){ return {}; });
    if (!response.ok) { var error = new Error(data.error || 'Admin request failed.'); error.status = response.status; throw error; } return data;
  }

  function adminEscape(value) { return escapeHTML(value == null ? '' : String(value)); }

  async function refreshVaultFromServer() {
    try {
      var data = await fetch('/api/vault/problems').then(function(r) { if (!r.ok) throw new Error('Vault unavailable'); return r.json(); });
      vaultCustomProblems = Array.isArray(data.problems) ? data.problems : [];
      vaultRemovedIds = Array.isArray(data.removedIds) ? data.removedIds.map(String) : [];
      vaultCustomProblems.forEach(function(p) { if (p.category && p.categoryName && !PATTERNS_DATA.some(function(c) { return c[0] === p.category; })) PATTERNS_DATA.push([p.category, p.categoryName]); });
      renderVaultProgress(); renderVaultSidebar(); renderVaultProblems();
    } catch (err) { showToast(err.message || 'Could not refresh Problem Vault.', '⚠'); }
  }

  async function renderAdminContentLists() {
    if (!isAdminAuthenticated || !adminSessionToken) return;
    var results = await Promise.all([adminRequest('/api/admin/tasks'), adminRequest('/api/admin/resources'), adminRequest('/api/admin/vault/problems')]);
    var tasks = results[0].tasks || [], resources = results[1].resources || [], vaultData = results[2] || {};
    var removed = Array.isArray(vaultData.removedIds) ? vaultData.removedIds.map(String) : [];
    var custom = Array.isArray(vaultData.problems) ? vaultData.problems : [];
    var vaultItems = vaultBaseProblems.filter(function(p) { return removed.indexOf(String(p[2])) === -1; }).map(function(p) { return { id:p[2], title:p[1], category:p[0], fixed:true }; }).concat(custom.map(function(p) { return { id:p.id, title:p.title, category:p.categoryName || p.category, fixed:false }; }));
    var taskBox = $('admin-manage-tasks'), resBox = $('admin-manage-resources'), vaultBox = $('admin-manage-vault');
    if (taskBox) taskBox.innerHTML = tasks.length ? tasks.map(function(t) { return '<div class="admin-content-row"><div><b>' + adminEscape(t.title) + '</b><span>' + adminEscape(t.platform || '') + ' · ' + adminEscape(t.difficulty || '') + '</span></div><button class="bs-ctl-btn btn-remove-task" data-id="' + adminEscape(t.id) + '">Remove</button></div>'; }).join('') : '<p class="sm">No daily tasks published.</p>';
    if (resBox) resBox.innerHTML = resources.length ? resources.map(function(r) { return '<div class="admin-content-row"><div><b>' + adminEscape(r.title) + '</b><span>' + adminEscape(r.type || 'Resource') + '</span></div><button class="bs-ctl-btn btn-remove-resource" data-id="' + adminEscape(r.id) + '">Remove</button></div>'; }).join('') : '<p class="sm">No custom resources published.</p>';
    if (vaultBox) vaultBox.innerHTML = vaultItems.length ? vaultItems.map(function(v) { return '<div class="admin-content-row"><div><b>' + adminEscape(v.title) + '</b><span>' + adminEscape(v.category) + (v.fixed ? ' · Built-in' : ' · Custom') + '</span></div><button class="bs-ctl-btn btn-remove-vault" data-id="' + adminEscape(v.id) + '">Remove</button></div>'; }).join('') : '<p class="sm">No problems in the vault.</p>';
    document.querySelectorAll('.btn-remove-task').forEach(function(btn) { btn.onclick = async function() { if (!confirm('Remove this daily task?')) return; try { await adminRequest('/api/admin/tasks/' + encodeURIComponent(btn.dataset.id), {method:'DELETE'}); dailyTasksList = dailyTasksList.filter(function(t){return t.id !== btn.dataset.id;}); renderDailyTasks(); await renderAdminContentLists(); await renderAdminData(); showToast('Daily task removed.', '✓'); } catch(e) { showToast(e.message, '⚠'); } }; });
    document.querySelectorAll('.btn-remove-resource').forEach(function(btn) { btn.onclick = async function() { if (!confirm('Remove this resource?')) return; try { await adminRequest('/api/admin/resources/' + encodeURIComponent(btn.dataset.id), {method:'DELETE'}); for (var i = GUIDES_DATA.length - 1; i >= 0; i--) if (GUIDES_DATA[i].id === btn.dataset.id) GUIDES_DATA.splice(i, 1); initGuides(); await renderAdminContentLists(); showToast('Resource removed.', '✓'); } catch(e) { showToast(e.message, '⚠'); } }; });
    document.querySelectorAll('.btn-remove-vault').forEach(function(btn) { btn.onclick = async function() { if (!confirm('Remove this problem from the public Problem Vault?')) return; try { await adminRequest('/api/admin/vault/problems/' + encodeURIComponent(btn.dataset.id), {method:'DELETE'}); await renderAdminContentLists(); await refreshVaultFromServer(); showToast('Problem removed from Vault.', '✓'); } catch(e) { showToast(e.message, '⚠'); } }; });
  }

  function initAdminConsole() {
    var authBox = $('admin-auth-box');
    var dashboard = $('admin-dashboard');
    var btnLogin = $('btn-admin-login');
    var btnLogout = $('btn-admin-logout');
    var passInput = $('admin-pass-input');

    if (btnLogin && passInput) {
      btnLogin.onclick = async function() {
        var key = passInput.value.trim();
        if (!key) return showToast('Enter the admin key.', '⚠');
        btnLogin.disabled = true;
        try {
          var response;
          try {
            response = await fetch('/api/admin/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({key:key}) });
          } catch (networkError) {
            throw new Error('Cannot reach the TOP-X backend. Start it from the project folder with `npm start`, then open http://localhost:3000 (do not open index.html directly).');
          }
          var data = await response.json().catch(function(){ return {}; });
          if (!response.ok) throw new Error(data.error || ('Admin authentication failed (HTTP ' + response.status + ').'));
          adminSessionToken = true; isAdminAuthenticated = true; window.topxIsAdminAuthenticated = true; if (window.topxSyncAdminNavVisibility) window.topxSyncAdminNavVisibility();
          authBox.style.display = 'none'; dashboard.style.display = 'flex';
          await renderAdminData(); await renderAdminContentLists();
          try { var resourceData = await adminRequest('/api/admin/resources'); (resourceData.resources || []).slice().reverse().forEach(function(item){ if(!GUIDES_DATA.some(function(g){return g.id && g.id===item.id;})) GUIDES_DATA.unshift(item); }); initGuides(); } catch (_) {}
          passInput.value = '';
          showToast('Authenticated as Platform Administrator.', '✓');
        } catch (err) { showToast(err.message || 'Admin login failed.', '⚠'); }
        finally { btnLogin.disabled = false; }
      };
    }

    if (btnLogout) {
      btnLogout.onclick = async function() {
        try {
          await adminRequest('/api/admin/logout', { method: 'POST' });
          isAdminAuthenticated = false; adminSessionToken = null;
          window.topxIsAdminAuthenticated = false;
          if (window.topxSyncAdminNavVisibility) window.topxSyncAdminNavVisibility();
          dashboard.style.display = 'none';
          authBox.style.display = 'block';
          showToast('Admin session closed', '🔒');
        } catch(err) { showToast(err.message || 'Could not sign out admin.', '⚠'); }
      };
    }

    adminRequest('/api/admin/overview').then(function() {
      adminSessionToken = true; isAdminAuthenticated = true; window.topxIsAdminAuthenticated = true;
      if (window.topxSyncAdminNavVisibility) window.topxSyncAdminNavVisibility();
      if (authBox) authBox.style.display = 'none';
      if (dashboard) dashboard.style.display = 'flex';
      return Promise.all([renderAdminData(), renderAdminContentLists()]);
    }).catch(function(err) {
      if (err.status !== 401) showToast(err.message || 'Could not verify the admin session.', '⚠');
    });

    // Form: Add Daily Task
    var formTask = $('form-add-task');
    if (formTask) {
      formTask.onsubmit = async function(e) {
        e.preventDefault();
        var title = $('new-task-title').value.trim();
        var plat = $('new-task-plat').value;
        var diff = $('new-task-diff').value.trim();
        var url = $('new-task-url').value.trim();

        var newTask = {
          id: 'task-' + Date.now(),
          title: title,
          platform: plat,
          difficulty: diff,
          points: 60,
          url: url || 'https://leetcode.com',
          isCompleted: false
        };

        if (!isAdminAuthenticated) return showToast('Please sign in as admin first.', '⚠');
        try {
          var result = await adminRequest('/api/admin/tasks', { method: 'POST', body: JSON.stringify({ title:title, platform:plat, difficulty:diff, points:60, url:url || 'https://leetcode.com' }) });
          dailyTasksList.unshift(Object.assign({}, result.task, { isCompleted:false }));
          renderDailyTasks(); await renderAdminData(); await renderAdminContentLists(); formTask.reset();
          showToast('Task saved to the server.', '✓');
        } catch (err) { showToast(err.message, '⚠'); }
      };
    }

    // Form: Add Resource
    var formRes = $('form-add-resource');
    if (formRes) {
      formRes.onsubmit = async function(e) {
        e.preventDefault();
        var title = $('new-res-title').value.trim();
        var type = $('new-res-type').value.trim();
        var time = $('new-res-time').value.trim();
        var link = $('new-res-link').value.trim();
        var desc = $('new-res-desc').value.trim();

        if (!isAdminAuthenticated) return showToast('Please sign in as admin first.', '⚠');
        try {
          var result = await adminRequest('/api/admin/resources', { method:'POST', body:JSON.stringify({title:title,type:type||'Article',time:time||'15 min read',desc:desc,link:link||'https://example.com'}) });
          GUIDES_DATA.unshift(result.resource); initGuides(); await renderAdminContentLists(); formRes.reset(); showToast('Resource saved to the server.', '✓');
        } catch (err) { showToast(err.message, '⚠'); }
      };
    }

    var formVault = $('form-add-vault-problem');
    if (formVault) formVault.onsubmit = async function(e) {
      e.preventDefault();
      if (!isAdminAuthenticated) return showToast('Please sign in as admin first.', '⚠');
      var title = $('new-vault-title').value.trim(), url = $('new-vault-url').value.trim(), categoryName = $('new-vault-category').value.trim();
      var urlParts = url.split('/').filter(Boolean);
      var slug = $('new-vault-slug').value.trim() || (urlParts.length ? urlParts[urlParts.length - 1].replace(/[^a-zA-Z0-9-]/g, '').toLowerCase() : '');
      var companies = $('new-vault-companies').value.split(',').map(function(x) { return x.trim(); }).filter(Boolean);
      try {
        await adminRequest('/api/admin/vault/problems', {method:'POST', body:JSON.stringify({title:title,url:url,categoryName:categoryName,slug:slug,difficulty:Number($('new-vault-difficulty').value),companies:companies,intuition:$('new-vault-intuition').value.trim()})});
        formVault.reset(); await refreshVaultFromServer(); await renderAdminContentLists(); showToast('Problem added to the public Vault.', '✓');
      } catch(err) { showToast(err.message || 'Could not add problem.', '⚠'); }
    };
    var refreshContentBtn = $('btn-refresh-admin-content');
    if (refreshContentBtn) refreshContentBtn.onclick = async function() { try { await renderAdminContentLists(); showToast('Content lists refreshed.', '✓'); } catch(err) { showToast(err.message || 'Could not refresh content.', '⚠'); } };
  }

  async function renderAdminData() {
    if (!isAdminAuthenticated || !adminSessionToken) return;
    try {
      var data = await adminRequest('/api/admin/overview');
      if ($('admin-stat-users')) $('admin-stat-users').textContent = data.totalUsers;
      if ($('admin-stat-tasks')) $('admin-stat-tasks').textContent = data.totalTasks;
      if ($('admin-stat-pro')) $('admin-stat-pro').textContent = data.proUsers;
      if ($('admin-stat-problems')) $('admin-stat-problems').textContent = data.totalProProblems;
      var tbody = $('admin-users-table'); if (!tbody) return;
      tbody.innerHTML = data.users.map(function(u) {
        function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]); }); }
        return '<tr><td><b>' + esc(u.name) + '</b></td><td>' + esc(u.email) + '</td><td><code>' + esc(u.handles && u.handles.leetcode || '—') + '</code></td><td><code>' + esc(u.handles && u.handles.codeforces || '—') + '</code></td><td><code>' + esc(u.handles && u.handles.codechef || '—') + '</code></td><td>' + (u.isPro ? '<span style="color:var(--easy);font-weight:700">Pro</span>' : '<span style="color:var(--mute)">Free</span>') + '</td><td>' + esc(u.proVerificationStatus || 'not requested') + '</td><td><button class="bs-ctl-btn btn-admin-toggle-pro" data-id="' + esc(u.id) + '" data-pro="' + (!!u.isPro) + '" style="font-size:11px;padding:3px 8px">' + (u.isPro ? 'Revoke Pro' : 'Grant Pro') + '</button></td></tr>';
      }).join('');
      tbody.querySelectorAll('.btn-admin-toggle-pro').forEach(function(b) {
        b.onclick = async function() {
          try { await adminRequest('/api/admin/toggle-pro', {method:'POST', body:JSON.stringify({userId:this.dataset.id,isPro:this.dataset.pro !== 'true'})}); await renderAdminData(); showToast('Member status updated.', '✓'); }
          catch(err) { showToast(err.message, '⚠'); }
        };
      });
    } catch (err) { showToast(err.message || 'Could not load admin data.', '⚠'); }
  }

  // =========================================================================
  // BOOTSTRAP INITIALIZATION
  // =========================================================================
  function boot() {
    initTheme();
    initRouter();
    initDropdowns();
    initCommandPalette();

    // Dashboard and personal data stay uninitialized until the backend validates the session.
    setInterval(updateContestTicker, 1000);
    updateContestTicker();

    // Prototype User buttons
    document.querySelectorAll('.proto-btn[data-user], #btn-sim-solve').forEach(function(btn) { btn.style.display = 'none'; });

    // 2. Initialize 3D Visualizers
    if (window.TopXVisualizers) {
      // Dashboard 3D Binary Search
      visualizerInstances.binarySearchDash = window.TopXVisualizers.initBinarySearch('dash-gl-canvas', 'dash-ro-hud');

      // Leaderboard 3D Bubble Sort
      visualizerInstances.bubbleSortLB = window.TopXVisualizers.initBubbleSort('lb-bs-canvas', 'lb-bs-ro', 'lb-bs-pz', 'lb-bs-sp', 'lb-bs-sh');

      // Lab 3D Pathfinding Maze
      visualizerInstances.pathfindingLab = window.TopXVisualizers.initPathfinding('lab-pf-canvas', 'lab-pf-table', 'lab-pf-msg', 'lab-pf-pz', 'lab-pf-sp', 'lab-pf-nm', '.lab-pf-algo-btn');

      // Lab 3D Binary Search
      visualizerInstances.binarySearchLab = window.TopXVisualizers.initBinarySearch('lab-bs-canvas', 'lab-bs-ro');

      // Lab 3D Bubble Sort
      visualizerInstances.bubbleSortLab = window.TopXVisualizers.initBubbleSort('lab-sort-canvas', 'lab-sort-ro', 'lab-sort-pz', 'lab-sort-sp', 'lab-sort-sh');
    }

    // Initialize admin authentication first so an unrelated module failure cannot
    // leave the Secure Admin Console button without a click handler.
    try { initAdminConsole(); } catch (err) { console.error('Admin console initialization failed:', err); }

    // Initialize modules independently; one broken feature must not disable the rest.
    [initLeaderboard, initVault, initBlueprints, initRoadmaps, initVisualizerLab,
     initGuides, initProfileAndAuth, initProfilePage, initTopXAuthGate,
     initDailyTasks, initTopXPro].forEach(function(initModule) {
      try { initModule(); } catch (err) { console.error('Module initialization failed (' + (initModule.name || 'anonymous') + '):', err); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
