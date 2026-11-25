# A3 – Room cleaning multi-agent simulation

`Main.py` has two sub-commands:

| Sub-command | What it does |
|---|---|
| `Parameters` | Runs the simulation with the given parameters and records it (CSV files). With `--AgentsList` it runs the analysis (design matrix). |
| `Sim` | Shows the last recorded simulation in the browser (http://127.0.0.1:5000). |

## Requirements

```bash
pip install numpy pandas flask matplotlib
```

## Simulation 1 – one agent, three planning methods

```bash
python Main.py Parameters --M 10 --N 10 --Agents 1 --Dirty 0.3 --Locked 0.1 --MaxTime 300 --Trajectory zigzag
python Main.py Parameters --M 10 --N 10 --Agents 1 --Dirty 0.3 --Locked 0.1 --MaxTime 300 --Trajectory random
python Main.py Parameters --M 10 --N 10 --Agents 1 --Dirty 0.3 --Locked 0.1 --MaxTime 300 --Trajectory local
python Main.py Sim
```

## Simulation 2 – four agents starting at the same position

```bash
python Main.py Parameters --M 10 --N 10 --Agents 4 --Dirty 0.3 --Locked 0.1 --MaxTime 300 --Trajectory zigzag
python Main.py Sim
```

Repeat with `--Trajectory random` and `--Trajectory local` for the three videos.

## Analysis – effect of adding more agents

```bash
python Main.py Parameters --M 10 --N 10 --Dirty 0.3 --Locked 0.1 --MaxTime 300 --AgentsList 1 2 4 8 --Trajectories zigzag random local --Repeats 20
```

Saves `DesignMatrix.csv` (one row per run), `AnalysisSummary.csv` (mean time, movements, % cleaned and probability that all dirt is cleaned, per method and number of agents) and `Analysis.png`.

## Parameters

| Option | Meaning |
|---|---|
| `--M`, `--N` | Room size (rows × columns) |
| `--Agents` | Number of agents |
| `--Dirty` | Fraction of free cells that are dirty (0–1), placed at random |
| `--Locked` | Fraction of cells the agents can not visit (0–1), placed at random |
| `--MaxTime` | Maximum simulation time (steps) |
| `--Trajectory` | `zigzag`, `random` or `local` (local search) |
| `--Start` | Start cell of every agent (default 0) |
| `--Seed` | Random seed (same seed → same room) |

## Planning methods

- **zigzag** – the room is split into one region per agent (4 agents → 4 quadrants, 3 → 3 strips) and each agent sweeps its region row by row.
- **random** – each step the agent moves to a random free neighbour cell.
- **local** – local search: the agent goes by the shortest path to the closest dirty cell that no other agent is going to.

## Recorded data (after `Parameters`)

| File | Content |
|---|---|
| `Results.csv` | Time to clean, % visited cells, % cleaned cells, total movements, movements per agent |
| `AgentsResults.csv` | Movements and cleaned cells per agent |
| `RoutesNew.csv` | Position of every agent at every step |
| `NodesNew.csv` | The room: dirty, locked and start cells, and when each cell was cleaned / visited |
