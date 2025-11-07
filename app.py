from flask import Flask, render_template, send_from_directory, url_for

import os
import urllib.parse

class Library:
	def __init__(self, author, name):
		self.author = author
		self.name = name
		
		self.link = url_for("library", author=urllib.parse.quote_plus(author), name=urllib.parse.quote_plus(name))

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

@app.route("/libraries/<author>/<library>")
def libraries(author, library):
	print(author, library)
	return send_from_directory("Libraries", f"{author}/{library}.json")