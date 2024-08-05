function checkTasks() {
  const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  tasks.forEach(function(task) {
    if (task.time === now) {
      alert(`Reminder: You have a task to do - ${task.task}`);
    } else if (task.time < now) { // Check if the task time has passed
      // Check if the task hasn't been completed
      const taskCompleted = tasks.some(t => t.id === task.id); 
      if (!taskCompleted) {
        alert(`Alert: The task "${task.task}" scheduled for ${task.time} has not been completed.`);
      }
    }
  });
}
