# A3 – Room cleaning multi-agent simulation

Python simulates the agents (`LIB.py`) and a WebGL page (`static/app.js`) replays the result.

## Requirements

```bash
pip install numpy pandas flask matplotlib
```

## Simulation 1 – one agent

```bash
python Main.py Sim --Sim 1 --M 10 --N 10 --Dirty 0.3 --Locked 0.1 --Battery 60 --MaxTime 500 --Trajectory zigzag
```

Open http://127.0.0.1:5000 to watch it.

## Simulation 2 – agents at random start points

```bash
python Main.py Sim --Sim 2 --Agents 4 --M 10 --N 10 --Dirty 0.3 --Locked 0.1 --Battery 60 --MaxTime 500 --Trajectory local
```

Each agent starts at a random cell. Every start cell is a charging station, and in Simulation 2 an agent can recharge at any of them.

## Effect of adding more agents

```bash
python Main.py Experiments --M 15 --N 15 --Trajectory local --Battery 80 --MaxTime 1000 --AgentsList 1 2 4 8 --Repeats 5
```

Saves `Experiments.csv` (every run), `ExperimentsSummary.csv` (average per number of agents) and `Experiments.png`.

## Parameters

| Option | Meaning |
|---|---|
| `--M`, `--N` | Room size (rows × columns) |
| `--Agents` | Number of agents (Simulation 2) |
| `--Dirty` | Fraction of free cells that are dirty (0–1) |
| `--Locked` | Fraction of cells the agents can not visit (0–1) |
| `--MaxTime` | Maximum simulation time (steps) |
| `--Battery` | Maximum number of cells an agent can move before recharging |
| `--Trajectory` | `zigzag`, `spiral`, `random` or `local` (greedy local search for the closest dirt) |
| `--Sim` | `1` one agent at cell 0, `2` agents at random start points |
| `--Seed` | Random seed (same seed → same room) |
| `--NoServer` | Only run and save the results |

Dirty and locked cells are placed at random. An agent goes back to a charging station when its battery would not be enough to get there with 5% left, and it recharges to 100%.

## Recorded data (after `Sim`)

| File | Content |
|---|---|
| `SimResults.csv` | Time to clean, % visited cells, % cleaned cells, total / mean movements, recharges |
| `SimAgents.csv` | Movements, recharges and cleaned cells per agent |
| `SimProgress.csv` | Cleaned % and visited % at every step |
| `SimRoutes.csv` | Position, battery and action of every agent at every step |
| `SimNodes.csv` | The room: dirty, locked and charger cells, and when each cell was cleaned / visited |
