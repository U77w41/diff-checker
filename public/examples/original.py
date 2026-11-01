def process_data(items):
    results = []
    for item in items:
        # Filter negative values
        if item > 0:
            results.append(item * 2)
    return results
