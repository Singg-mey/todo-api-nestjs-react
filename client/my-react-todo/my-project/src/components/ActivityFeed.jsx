import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export default function ActivityFeed({ refreshTrigger }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/activity');
      setActivities(res.data || []);
    } catch (err) {
      console.error('Failed to load activity feed:', err);
      setError('Could not load activity log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [refreshTrigger]);

  const getBadgeStyle = (action) => {
    switch (action) {
      case 'todo.created':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'todo.updated':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'todo.deleted':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatActionName = (action) => {
    switch (action) {
      case 'todo.created':
        return 'Created Todo';
      case 'todo.updated':
        return 'Updated Todo';
      case 'todo.deleted':
        return 'Deleted Todo';
      default:
        return action;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 my-6">
      <div className="flex items-center justify-between mb-4 border-b pb-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span>⚡</span> Real-Time Activity Feed
          </h2>
          <p className="text-sm text-gray-500">
            Powered by NestJS EventEmitter2 (Core 01)
          </p>
        </div>
        <button
          onClick={fetchActivities}
          disabled={loading}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition"
        >
          {loading ? 'Refreshing...' : '↻ Refresh Feed'}
        </button>
      </div>

      {error && (
        <div className="p-3 mb-3 text-sm text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      {activities.length === 0 && !loading ? (
        <p className="text-sm text-gray-500 text-center py-6">
          No activity recorded yet. Create, edit, or delete a todo to see live events logged here!
        </p>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {activities.map((act) => (
            <div
              key={act.id}
              className="flex items-start justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition border border-gray-200 text-sm"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getBadgeStyle(
                    act.action
                  )}`}
                >
                  {formatActionName(act.action)}
                </span>
                <div>
                  <span className="font-medium text-gray-900">
                    "{act.todoTitle || `Todo #${act.todoId}`}"
                  </span>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Action ID: #{act.id} &bull; Todo ID: #{act.todoId}
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                {new Date(act.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

