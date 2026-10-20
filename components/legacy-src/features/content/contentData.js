// Curated TOP-X content migrated from the original data layer.
export const BLUEPRINTS_DATA = {
  "graph": {
    "title": "Dijkstra's Algorithm (Priority Queue)",
    "badge": "GRAPH THEORY • SHORTEST PATH",
    "desc": "Finds the single-source shortest path in a weighted graph with non-negative edge costs using a min-heap priority queue.",
    "time": "O((V + E) log V)",
    "space": "O(V + E)",
    "signals": [
      "Non-negative weighted edges (distances, costs, delays)",
      "Single-source to all destinations or single target",
      "Greedy choice: expand globally lowest cumulative cost vertex"
    ],
    "code": {
      "python": "import heapq\n\ndef dijkstra(n: int, edges: list[list[int]], start: int) -> dict:\n    # 1. Build adjacency list: node -> list of (neighbor, weight)\n    graph = {i: [] for i in range(n)}\n    for u, v, w in edges:\n        graph[u].append((v, w))\n    \n    # 2. Min-heap stores tuples of (cumulative_distance, node)\n    pq = [(0, start)]\n    dist = {start: 0}\n    \n    while pq:\n        d, u = heapq.heappop(pq)\n        \n        # Skip stale entries popped with higher distance\n        if d > dist[u]:\n            continue\n            \n        for v, weight in graph[u]:\n            new_d = d + weight\n            if v not in dist or new_d < dist[v]:\n                dist[v] = new_d\n                heapq.heappush(pq, (new_d, v))\n                \n    return dist",
      "cpp": "#include <vector>\n#include <queue>\nusing namespace std;\n\nvector<int> dijkstra(int n, vector<vector<pair<int, int>>>& adj, int src) {\n    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;\n    vector<int> dist(n, 1e9);\n    \n    dist[src] = 0;\n    pq.push({0, src}); // {distance, node}\n    \n    while (!pq.empty()) {\n        auto [d, u] = pq.top();\n        pq.pop();\n        \n        if (d > dist[u]) continue;\n        \n        for (auto& [v, w] : adj[u]) {\n            if (dist[u] + w < dist[v]) {\n                dist[v] = dist[u] + w;\n                pq.push({dist[v], v});\n            }\n        }\n    }\n    return dist;\n}",
      "javascript": "function dijkstra(n, edges, start) {\n  const adj = Array.from({ length: n }, () => []);\n  for (const [u, v, w] of edges) adj[u].push([v, w]);\n\n  const dist = Array(n).fill(Infinity);\n  dist[start] = 0;\n\n  // Min-priority queue: [dist, node]\n  const pq = [[0, start]];\n\n  while (pq.length > 0) {\n    pq.sort((a, b) => a[0] - b[0]);\n    const [d, u] = pq.shift();\n\n    if (d > dist[u]) continue;\n\n    for (const [v, w] of adj[u]) {\n      if (dist[u] + w < dist[v]) {\n        dist[v] = dist[u] + w;\n        pq.push([dist[v], v]);\n      }\n    }\n  }\n  return dist;\n}"
    }
  },
  "two": {
    "title": "Two Pointers (Inward Pinch / Collision)",
    "badge": "ARRAY • SEARCH OPTIMIZATION",
    "desc": "Reduces O(N²) quadratic nested loops down to O(N) linear time on sorted arrays by advancing two pointers toward each other.",
    "time": "O(N) Time",
    "space": "O(1) Auxiliary Space",
    "signals": [
      "Array is sorted or sorting does not violate requirements",
      "Finding pairs that satisfy a condition (sum, diff, area)",
      "Monotonicity: moving pointer always strictly increases/decreases candidate sum"
    ],
    "code": {
      "python": "def two_sum_sorted(numbers: list[int], target: int) -> list[int]:\n    left, right = 0, len(numbers) - 1\n    \n    while left < right:\n        current_sum = numbers[left] + numbers[right]\n        if current_sum == target:\n            return [left + 1, right + 1] # 1-indexed result\n        elif current_sum < target:\n            left += 1  # Need larger value\n        else:\n            right -= 1 # Need smaller value\n            \n    return []",
      "cpp": "vector<int> twoSum(vector<int>& numbers, int target) {\n    int left = 0, right = numbers.size() - 1;\n    while (left < right) {\n        int sum = numbers[left] + numbers[right];\n        if (sum == target) return {left + 1, right + 1};\n        else if (sum < target) ++left;\n        else --right;\n    }\n    return {};\n}",
      "javascript": "function twoSumSorted(numbers, target) {\n  let left = 0, right = numbers.length - 1;\n  while (left < right) {\n    const sum = numbers[left] + numbers[right];\n    if (sum === target) return [left + 1, right + 1];\n    else if (sum < target) left++;\n    else right--;\n  }\n  return [];\n}"
    }
  },
  "binary": {
    "title": "Binary Search (Search Space Halving)",
    "badge": "DIVIDE & CONQUER • LOGARITHMIC",
    "desc": "Efficiently discards half of the monotonic search domain at every iteration. Critical for minimizing operations on large scale datasets.",
    "time": "O(log N) Time",
    "space": "O(1) Auxiliary Space",
    "signals": [
      "Sorted array or monotonic property f(x) -> True/False",
      "Find minimum k such that condition(k) is met",
      "Always calculate midpoint safely: mid = left + (right - left) // 2"
    ],
    "code": {
      "python": "def binary_search(nums: list[int], target: int) -> int:\n    left, right = 0, len(nums) - 1\n    \n    while left <= right:\n        # Avoid potential integer overflow\n        mid = left + (right - left) // 2\n        \n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n            \n    return -1",
      "cpp": "int search(vector<int>& nums, int target) {\n    int left = 0, right = nums.size() - 1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (nums[mid] == target) return mid;\n        else if (nums[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}",
      "javascript": "function binarySearch(nums, target) {\n  let left = 0, right = nums.length - 1;\n  while (left <= right) {\n    const mid = Math.floor(left + (right - left) / 2);\n    if (nums[mid] === target) return mid;\n    else if (nums[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}"
    }
  },
  "prefix": {
    "title": "Prefix Sum & Hash Map Lookup",
    "badge": "ARRAY • O(1) RANGE QUERIES",
    "desc": "Precomputes running cumulative aggregates so any arbitrary range sum [L, R] can be answered in O(1) constant time.",
    "time": "O(N) Precomputation / O(1) Query",
    "space": "O(N) Prefix Hash Storage",
    "signals": [
      "Subarray sum equals target / continuous sum divisibility",
      "Multiple repetitive range sum queries on immutable array",
      "Relation: sum(nums[L..R]) = prefix[R+1] - prefix[L]"
    ],
    "code": {
      "python": "def subarray_sum_equals_k(nums: list[int], k: int) -> int:\n    count = 0\n    curr_sum = 0\n    # Store frequencies of seen prefix sums\n    prefix_counts = {0: 1}\n    \n    for x in nums:\n        curr_sum += x\n        # If (curr_sum - k) was observed previously, we found valid subarrays\n        if curr_sum - k in prefix_counts:\n            count += prefix_counts[curr_sum - k]\n            \n        prefix_counts[curr_sum] = prefix_counts.get(curr_sum, 0) + 1\n        \n    return count",
      "cpp": "int subarraySum(vector<int>& nums, int k) {\n    unordered_map<int, int> prefixCounts;\n    prefixCounts[0] = 1;\n    int currSum = 0, count = 0;\n    \n    for (int x : nums) {\n        currSum += x;\n        if (prefixCounts.count(currSum - k)) {\n            count += prefixCounts[currSum - k];\n        }\n        prefixCounts[currSum]++;\n    }\n    return count;\n}",
      "javascript": "function subarraySum(nums, k) {\n  const map = new Map([[0, 1]]);\n  let currSum = 0, count = 0;\n\n  for (const x of nums) {\n    currSum += x;\n    if (map.has(currSum - k)) {\n      count += map.get(currSum - k);\n    }\n    map.set(currSum, (map.get(currSum) || 0) + 1);\n  }\n  return count;\n}"
    }
  }
};
export const ROADMAP_DSA_PHASES = [
  {
    "phase": "PHASE 01",
    "duration": "2 to 3 Weeks",
    "title": "Language Mastery, Big-O Analysis & Basic Arrays",
    "platforms": [
      "LeetCode Easy",
      "NeetCode Basics"
    ],
    "desc": "Build rock-solid foundations: standard library containers, asymptotically optimal iteration, and memory layout.",
    "milestones": [
      {
        "id": "dsa_1_1",
        "text": "Master dynamic arrays (vectors/lists) & amortized doubling time"
      },
      {
        "id": "dsa_1_2",
        "text": "Time & Space complexity proofs (master theorem, recurrence relations)"
      },
      {
        "id": "dsa_1_3",
        "text": "Two pointers technique (inward collision & fast-slow pointer)"
      },
      {
        "id": "dsa_1_4",
        "text": "Hash maps & Hash sets: collision resolution, load factors, O(1) lookup"
      },
      {
        "id": "dsa_1_5",
        "text": "Solve 25 LeetCode Easy problems with O(1) auxiliary space"
      }
    ],
    "target": "Solve 25 LeetCode Easy problems with O(1) extra space"
  },
  {
    "phase": "PHASE 02",
    "duration": "3 to 4 Weeks",
    "title": "Linear Structures, Sliding Window & Monotonicity",
    "platforms": [
      "LeetCode Medium",
      "Blind 75"
    ],
    "desc": "Master variable & fixed size windows, recursive linked list rewiring, and stack-based monotonic scans.",
    "milestones": [
      {
        "id": "dsa_2_1",
        "text": "Sliding Window: fixed window size vs dynamic condition-based contraction"
      },
      {
        "id": "dsa_2_2",
        "text": "Monotonic Stack: next greater element, stock span, histogram area"
      },
      {
        "id": "dsa_2_3",
        "text": "Monotonic Deque: sliding window maximum in O(N) linear time"
      },
      {
        "id": "dsa_2_4",
        "text": "Linked Lists: in-place reversal, cycle detection (Floyd's Tortoise & Hare)"
      },
      {
        "id": "dsa_2_5",
        "text": "Binary Search on answers: predicate monotonicity & range inflection"
      }
    ],
    "target": "Solve Sliding Window & Monotonic Stack Mediums in < 20 mins"
  },
  {
    "phase": "PHASE 03",
    "duration": "4 to 5 Weeks",
    "title": "Trees, Graphs & Exhaustive Recursion",
    "platforms": [
      "LeetCode Medium/Hard",
      "NeetCode 150"
    ],
    "desc": "Tree depth-first traversals, lowest common ancestors, graph representations, and shortest path traversals.",
    "milestones": [
      {
        "id": "dsa_3_1",
        "text": "Binary Search Trees: invariants, in-order validation, LCA"
      },
      {
        "id": "dsa_3_2",
        "text": "Graph BFS: shortest path on unweighted unit grids & level tracking"
      },
      {
        "id": "dsa_3_3",
        "text": "Graph DFS & Cycle Detection in directed vs undirected graphs"
      },
      {
        "id": "dsa_3_4",
        "text": "Topological Sort: Kahn's in-degree queue & post-order DFS"
      },
      {
        "id": "dsa_3_5",
        "text": "Dijkstra's Algorithm: priority queue on non-negative weighted graphs"
      }
    ],
    "target": "Model state spaces as graph traversals with clean recursion"
  },
  {
    "phase": "PHASE 04",
    "duration": "5 to 6 Weeks",
    "title": "Dynamic Programming, Heaps & Advanced Data Structures",
    "platforms": [
      "LeetCode Hard",
      "Striver SDE Sheet"
    ],
    "desc": "Deconstruct optimal substructures, 1D/2D memoization grids, interval DP, and min/max heap patterns.",
    "milestones": [
      {
        "id": "dsa_4_1",
        "text": "1D DP: Fibonacci recurrences, house robber, coin change variants"
      },
      {
        "id": "dsa_4_2",
        "text": "2D Grid DP & String Alignments: Longest Common Subsequence, Edit Distance"
      },
      {
        "id": "dsa_4_3",
        "text": "Knapsack Variants: 0/1 bounded, unbounded, subset sum partition"
      },
      {
        "id": "dsa_4_4",
        "text": "Min-Heap / Max-Heap: Top K Frequent, running median with dual heaps"
      },
      {
        "id": "dsa_4_5",
        "text": "Disjoint Set Union (Union-Find) with path compression & union by rank"
      }
    ],
    "target": "Quickly spot overlapping subproblems & optimize memory to O(1) or O(N)"
  },
  {
    "phase": "PHASE 05",
    "duration": "3 to 4 Weeks",
    "title": "Mock Interview Loops, System Design Drills & Polish",
    "platforms": [
      "Pramp",
      "LeetCode Contest",
      "FAANG Mock"
    ],
    "desc": "Timed technical drills, behavioral storytelling, and clean communication under pressure.",
    "milestones": [
      {
        "id": "dsa_5_1",
        "text": "Timed 45-min dry runs: problem breakdown, verbalizing tradeoffs"
      },
      {
        "id": "dsa_5_2",
        "text": "Edge-case stress testing: nulls, duplicates, overflows, integer bounds"
      },
      {
        "id": "dsa_5_3",
        "text": "Complete 10 mock technical screening rounds on Pramp / peer network"
      },
      {
        "id": "dsa_5_4",
        "text": "Master Top 50 Company Tagged problems for target engineering firms"
      },
      {
        "id": "dsa_5_5",
        "text": "Behavioral STAR method alignment with technical deep-dive stories"
      }
    ],
    "target": "Pass FAANG-tier coding bar with interview-grade polish"
  }
];
export const ROADMAP_CP_TIERS = [
  {
    "tier": "TIER 01",
    "rating": "0 to 1200 Rating · Newbie to Pupil",
    "title": "Implementation Speed & Modular Arithmetic",
    "platforms": [
      "Codeforces Div. 3",
      "AtCoder Beginner",
      "CSES"
    ],
    "desc": "Eliminate syntax friction, optimize I/O, and build intuition for basic number theory.",
    "milestones": [
      {
        "id": "cp_1_1",
        "text": "Fast I/O & template setup in modern C++ (C++17/20)"
      },
      {
        "id": "cp_1_2",
        "text": "Modular arithmetic, prime factorization & Sieve of Eratosthenes"
      },
      {
        "id": "cp_1_3",
        "text": "Greedy algorithms & sorting invariant proofs"
      },
      {
        "id": "cp_1_4",
        "text": "Prefix sums, coordinate compression & binary search"
      },
      {
        "id": "cp_1_5",
        "text": "Solve 100+ Codeforces Div. 3 Problem A & B sets"
      },
      {
        "id": "cp_1_6",
        "text": "Achieve stable 1200+ rating on Codeforces"
      }
    ],
    "target": "Zero implementation errors on contest Problems A & B"
  },
  {
    "tier": "TIER 02",
    "rating": "1200 to 1600 Rating · Pupil to Specialist",
    "title": "Combinatorics, Trees & Constructive Algorithms",
    "platforms": [
      "Codeforces Div. 2 (A-C)",
      "CSES Sorting & Searching"
    ],
    "desc": "Master invariant tracking, binary lifting, bitmask manipulation, and modular inverse.",
    "milestones": [
      {
        "id": "cp_2_1",
        "text": "Combinatorics: nCr under prime modulo with Fermat's Little Theorem"
      },
      {
        "id": "cp_2_2",
        "text": "Bitwise operations, XOR bases & submask iteration"
      },
      {
        "id": "cp_2_3",
        "text": "Tree basics: diameter, centroid, Euler tour technique"
      },
      {
        "id": "cp_2_4",
        "text": "Binary Lifting & Lowest Common Ancestor in O(log N)"
      },
      {
        "id": "cp_2_5",
        "text": "Constructive algorithms: parity analysis, induction patterns"
      },
      {
        "id": "cp_2_6",
        "text": "Consistently solve Div. 2 Problem C in live contests"
      }
    ],
    "target": "Cross 1400 - 1600 Specialist threshold"
  },
  {
    "tier": "TIER 03",
    "rating": "1600 to 1900 Rating · Specialist to Expert",
    "title": "Segment Trees, Tree DP & Flow Networks",
    "platforms": [
      "Codeforces Div. 2 (D-E)",
      "AtCoder Regular",
      "CSES Advanced"
    ],
    "desc": "Point/range segment tree updates with lazy propagation, tree dynamic programming, and matching.",
    "milestones": [
      {
        "id": "cp_3_1",
        "text": "Segment Tree with lazy propagation & coordinate compression"
      },
      {
        "id": "cp_3_2",
        "text": "Fenwick Tree (Binary Indexed Tree) for range updates & point queries"
      },
      {
        "id": "cp_3_3",
        "text": "Tree Dynamic Programming (rerooting technique & subtree merges)"
      },
      {
        "id": "cp_3_4",
        "text": "Bridges, Articulation Points & 2-SAT implications"
      },
      {
        "id": "cp_3_5",
        "text": "Maximum Bipartite Matching (Hopcroft-Karp / Dinic's Flow)"
      },
      {
        "id": "cp_3_6",
        "text": "Achieve Codeforces Expert (1600-1899 rating band)"
      }
    ],
    "target": "Crack Div. 2 Problem D within 60 minutes"
  },
  {
    "tier": "TIER 04",
    "rating": "1900 to 2200+ Rating · Candidate Master & ICPC",
    "title": "Heavy-Light Decomposition, Centroid DP & FFT",
    "platforms": [
      "Codeforces Div. 1",
      "ICPC Regionals",
      "OpenCup"
    ],
    "desc": "Elite collegiate competitive programming: polynomial multiplication, centroid trees, and randomized structures.",
    "milestones": [
      {
        "id": "cp_4_1",
        "text": "Heavy-Light Decomposition (HLD) with lazy segment tree on paths"
      },
      {
        "id": "cp_4_2",
        "text": "Centroid Decomposition for divide-and-conquer on trees"
      },
      {
        "id": "cp_4_3",
        "text": "Fast Fourier Transform (FFT / NTT) for polynomial multiplication"
      },
      {
        "id": "cp_4_4",
        "text": "Persistent Segment Trees & Treaps (Cartesian Trees)"
      },
      {
        "id": "cp_4_5",
        "text": "Convex Hull Trick & Li Chao Tree for DP optimization"
      },
      {
        "id": "cp_4_6",
        "text": "Qualify for ICPC Regional Onsites / Reach Candidate Master"
      }
    ],
    "target": "Rank in top 5% globally in Div. 1/Div. 2 combined contests"
  }
];
export const GUIDES_DATA = [
  {
    "title": "Red Blob Games: Introduction to A* & Dijkstra",
    "type": "Interactive",
    "time": "15 min read",
    "desc": "The definitive interactive guide to pathfinding algorithms with step-by-step grid visualizers and graph theory intuitions.",
    "link": "https://www.redblobgames.com/pathfinding/a-star/introduction.html"
  },
  {
    "title": "MIT 6.006: Dijkstra's Algorithm & Priority Queues",
    "type": "Video Lecture",
    "time": "50 min",
    "desc": "Prof. Erik Demaine breaks down shortest path correctness proofs, negative cycle implications, and binary heap runtimes.",
    "link": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/"
  },
  {
    "title": "Big-O Algorithm Complexity Matrix",
    "type": "Cheatsheet",
    "time": "Quick Reference",
    "desc": "Comprehensive reference table covering time and space complexities for sorting, graph traversals, and common data structures.",
    "link": "https://www.bigocheatsheet.com/"
  },
  {
    "title": "The Blind 75 / NeetCode Pattern Breakdown",
    "type": "Roadmap",
    "time": "Study Plan",
    "desc": "The standard 75 LeetCode problem progression grouped strictly by core patterns so you never waste time memorizing solutions.",
    "link": "https://neetcode.io/practice"
  },
  {
    "title": "CP-Algorithms: Algorithms & Data Structures in English",
    "type": "Competitive Wiki",
    "time": "Deep Dive",
    "desc": "The ultimate reference for competitive programming: segment trees, number theory, graph flows, and geometry proofs.",
    "link": "https://cp-algorithms.com/"
  },
  {
    "title": "Striver's SDE Sheet & A2Z DSA Course",
    "type": "Interview Curriculum",
    "time": "Comprehensive",
    "desc": "Curated end-to-end coding interview trajectory covering every foundational and advanced data structure pattern with video solutions.",
    "link": "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/"
  }
];
