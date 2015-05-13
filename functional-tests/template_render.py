# -*- coding: utf-8 -*-
from jinja2 import Template
from templates.content import pages
import codecs
import os

if not os.path.exists('../public/pages'):
    os.mkdir('../public/pages')

base = open('templates/base.html', 'r')
template = Template(base.read())
base.close()

parts = pages()

for page in parts:
    out = codecs.open("../public/pages/%s.html" % parts[page]['title'], 'w', 'utf-8')
    out.write(template.render(parts[page]))
    out.close()
