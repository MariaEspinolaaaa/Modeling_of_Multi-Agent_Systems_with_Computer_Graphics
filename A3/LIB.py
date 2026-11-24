import csv, ast, flask, pandas, numpy
from pathlib import Path

app = flask.Flask(__name__)
BASE = Path(__file__).resolve().parent

def load_nodes():
    nodes = {}
    with open(BASE / "NodesNew.csv", newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            point = tuple(float(v) for v in ast.literal_eval(row["Points"]))
            nodes[int(row["Node"])] = {
                "node": int(row["Node"]),
                "point": point,
                "dirt": int(row["Dirt"]),
                "charger": int(row.get("Charger") or 0)
            }
    return nodes

def load_routes():
    routes = {}
    with open(BASE / "RoutesNew.csv", newline="", encoding="utf-8") as f:
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

def node_matrix():
    B = numpy.zeros((8,8), dtype = numpy.int32);

    for i in range(8):
        for j in range(8):
            B[i,j] = numpy.ravel_multi_index([i, j], B.shape);

    return B

def zigzag_path():
    B = node_matrix();

    for i in range(8):
        if i % 2 == 0: continue
        B[i,:] = numpy.flip(B[i,:]);

    return B.flatten()

def random_path(steps = 40):
    B = node_matrix();
    moves = numpy.array([[1,0], [-1,0], [0,1], [0,-1]]);

    pos = numpy.array([0, 0]);
    path = [B[pos[0], pos[1]]];

    for _ in range(steps):
        new_pos = pos + moves
        valid = numpy.all((new_pos >= 0) & (new_pos < 8), axis = 1)
        options = new_pos[valid]
        pos = options[numpy.random.randint(len(options))]
        path.append(B[pos[0], pos[1]]);

    return numpy.array(path)

def spiral_path():
    B = node_matrix();
    path = [];

    while B.size > 0:
        path.extend(B[0,:].tolist());
        B = numpy.rot90(B[1:,:]);

    return numpy.array(path)

def Parameters(Options):
    print(Options.Agents)

    x, y = numpy.meshgrid(numpy.arange(0,8), numpy.arange(0,8));
    Points = numpy.concatenate( [x.flatten().reshape(-1,1), y.flatten().reshape(-1,1)], axis = 1 )
    Points = ["(%d,%d,0)"%(p[0], p[1])  for p in Points.tolist()];

    DF = pandas.DataFrame();

    DF = DF.assign(Node = numpy.arange(0, 64));
    DF = DF.assign(Points = Points);
    charger = 63
    DF = DF.assign(Dirt = numpy.where((DF["Node"] == 0) | (DF["Node"] == charger), 0, 1));
    DF = DF.assign(Charger = numpy.where(DF["Node"] == charger, 1, 0));

    print(DF)

    DF.to_csv(BASE / "NodesNew.csv", index = False);

    elevator = 0
    patterns = [zigzag_path, random_path, spiral_path]
    Routes = [];

    for a in range(Options.Agents):
        path = patterns[a % len(patterns)]();
        if path[-1] != elevator:
            path = numpy.append(path, elevator);

        DF = pandas.DataFrame();
        DF = DF.assign( Node = path);
        DF = DF.assign( Agent = a + 1);
        Routes.append(DF);

    DF = pandas.concat(Routes, ignore_index = True);
    DF = DF[["Agent", "Node"]];

    print(DF)

    DF.to_csv(BASE / "RoutesNew.csv", index = False);

def Sim(options):  #python Main.py Sim
    app.run(debug=True)