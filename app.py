from flask import Flask, render_template, request, send_from_directory, url_for
from werkzeug.security import safe_join

import os
from urllib.parse import quote_plus, unquote_plus

class Library:
	def __init__(self, author, name):
		self.author = author
		self.name = name
		
		self.link = url_for("library", author=quote_plus(author), name=quote_plus(name))
		self.raw_link = url_for("libraries", author=quote_plus(author), name=quote_plus(name))

app = Flask(__name__)

@app.route("/")
def homepage():
	libraries = []
	
	authors = os.listdir("Libraries")
	for author in authors:
		authors_libraries = os.listdir(f"Libraries/{author}")
		
		for library in authors_libraries:
			if library.endswith(".json"):
				libraries.append(Library(author, library[:-5]))
	
	return render_template("homepage.html", libraries=libraries)

@app.route("/library")
def library():
	return render_template("library.html")

@app.route("/librarysource")
def libraries():
	author_raw = request.args.get("author")
	name_raw = request.args.get("name")
	
	if author_raw is None or name_raw is None:
		abort(404)
	
	library_slug = f"{author_raw}/{name_raw}.json"
	return send_from_directory("Libraries", library_slug)

@app.route('/scripts/<filename>')
def scripts(filename):
	return send_from_directory(os.path.abspath('scripts'), filename, mimetype="text/javascript")
