import sys
import re

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Simple regex to find JSX tags (very primitive, doesn't handle strings well)
    # We'll just look for <Div and </Div etc.
    tags = re.findall(r'<(/?)([a-zA-Z0-9]+)', content)
    
    stack = []
    for is_closing, tag_name in tags:
        if tag_name.lower() in ['img', 'br', 'hr', 'input', 'meta', 'link']: continue # ignore self-closing if needed
        
        if is_closing:
            if not stack:
                print(f"Error: Found closing tag </{tag_name}> but stack is empty")
                continue
            last_tag = stack.pop()
            if last_tag != tag_name:
                print(f"Error: Expected </{last_tag}> but found </{tag_name}>")
        else:
            # Check for self-closing in the original string (harder with regex)
            # For simplicity, we'll just check if the tag name is in a list of known components or html tags
            stack.append(tag_name)
    
    if stack:
        print(f"Error: Tags left on stack: {stack}")
    else:
        print("Balanced!")

if __name__ == "__main__":
    check_balance(sys.argv[1])
