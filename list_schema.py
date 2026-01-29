
import re

with open('schema.ts', 'r') as f:
    content = f.read()

matches = re.findall(r'export const (\w+) = pgTable\("(\w+)"', content)
for m in matches:
    print(f"Variable: {m[0]}, Table: {m[1]}")
