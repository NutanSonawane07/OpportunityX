from flask import Flask, render_template, jsonify
import json

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/opportunities")
def get_opportunities():

    with open(
        "data/opportunities.json",
        "r",
        encoding="utf-8"
    ) as file:

        data = json.load(file)

    return jsonify(data)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=8080,
        debug=True
    )