const testCases = [
      {
        "input": {"a": 1, "b": 2},
        "expected_output": 3
      },
      {
        "input": {"a": -5, "b": 10},
        "expected_output": 5
      },
      {
        "input": {"a": 0, "b": 0},
        "expected_output": 0
      },
      {
        "input": {"a": 999, "b": 1},
        "expected_output": 1000
      },
      {
        "input": {"a": -100, "b": -200},
        "expected_output": -300
      },
      {
        "input": {"a": 2147483647, "b": 1},
        "expected_output": 2147483648
      },
      {
        "input": {"a": -2147483648, "b": -1},
        "expected_output": -2147483649
      }
    ];
  
export {testCases};