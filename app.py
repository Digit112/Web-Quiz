from flask import Flask, render_template, send_from_directory, url_for
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
		print(author)
		authors_libraries = os.listdir(f"Libraries/{author}")
		
		for library in authors_libraries:
			if library.endswith(".json"):
				libraries.append(Library(author, library[:-5]))
	
	return render_template("homepage.html", libraries=libraries)

@app.route("/library")
def library():
	return render_template("library.html")

@app.route("/libraries/<author>/<name>")
def libraries(author, name):
	library_slug = f"{unquote_plus(author)}/{unquote_plus(name)}.json"
	return send_from_directory("Libraries", library_slug)