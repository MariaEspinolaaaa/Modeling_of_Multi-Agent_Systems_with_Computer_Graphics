import csv, ast, flask, pandas, random
from pathlib import Path

app = flask.Flask(__name__)
BASE = Path(__file__).resolve().parent

def load_nodes():
    nodes = {}
    with open(BASE / "Nodes.csv", newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            point = tuple(float(v) for v in ast.literal_eval(row["Points"]))
            nodes[int(row["Node"])] = {
                "node": int(row["Node"]),
                "point": point,
                "dirt": int(row["Dirt"])
            }
    return nodes

def load_routes():
    routes = {}
    with open(BASE / "Routes.csv", newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            agent = int(row["Agent"])
            routes.setdefault(agent, []).append(int(row["Node"]))
    return routes

@app.route("/")
def index():
    return flask.render_template("index.html")

@app.route("/api/data")
def data():
    return flask.jsonify({"nodes": load_nodes(), "routes": load_routes()})

if __name__ == "__main__":
    app.run(debug=True)

def Parameters(Options):
    print(Options.Agents)
    DF=pandas.DataFrame(columns=["Agent", "Node"])

    nodes = load_nodes()
    start = 1
    bananas = [n for n, info in nodes.items() if info["dirt"] == 1]
    elevators = [n for n, info in nodes.items() if info["dirt"] == 0 and n != start]

    for a in range(Options.Agents):
        agent = a + 1
        route = [start]
        route += random.sample(bananas, random.randint(1, len(bananas)))
        route.append(random.choice(elevators))
        for node in route:
            DF.loc[len(DF)] = [agent, node]

    DF.to_csv(BASE / "NodesNew.csv", index=False)
    print(DF)

def Sim(options):  #python Main.py Sim
    app.run(debug=True)