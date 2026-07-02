
file_path = 'schema.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'pgTable("bc_plans"' in line or "pgTable('bc_plans'" in line:
            print(f"bc_plans found at line {i+1}")
        if 'business_impact_analyses' in line:
            print(f"business_impact_analyses found at line {i+1}")
        if 'healing_time_objectives' in line:
            print(f"healing_time_objectives found at line {i+1}")
