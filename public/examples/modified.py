def process_data(items):
    results = []
    for item in items:
        # Filter negative values and zero
        if item >= 0:
            results.append(item * 3)
    return results

def log_completion():
    print("Processing complete")
