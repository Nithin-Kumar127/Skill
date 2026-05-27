import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getGigs, reset } from '../features/gigs/gigSlice';

export default function MyGigs() {
  const dispatch = useDispatch();
  const { gigs, isLoading } = useSelector((state) => state.gigs);

  useEffect(() => {
    dispatch(getGigs());
    return () => dispatch(reset());
  }, [dispatch]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <NavLink to="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
          ← Back to Dashboard
        </NavLink>
        <h1 className="text-3xl font-bold text-gray-900">My Gigs</h1>
        <p className="mt-2 text-gray-600">Manage and track all your posted gigs</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading your gigs...</span>
        </div>
      ) : gigs && gigs.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {gigs.map((gig) => (
            <div
              key={gig._id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-gray-900 mb-2">
                    {gig.title}
                  </p>
                  <p className="text-sm font-medium text-green-600 mb-1">
                    Budget: ${gig.maxPr}
                  </p>
                  <p className="text-xs text-gray-500">
                    Duration: {gig.estimatedDuration}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  gig.status === 'open' ? 'bg-green-100 text-green-800' :
                  gig.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {gig.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-4 line-clamp-3">
                {gig.description}
              </div>
              <div className="flex flex-wrap gap-1">
                {gig.skillsRequired?.slice(0, 3).map((skill, index) => (
                  <span key={index} className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                    {skill}
                  </span>
                ))}
                {gig.skillsRequired?.length > 3 && (
                  <span className="text-xs text-gray-500">+{gig.skillsRequired.length - 3} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No gigs yet</h3>
          <p className="text-gray-600 mb-6">Start by posting your first gig to find talented freelancers.</p>
          <NavLink
            to="/create-gig"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Post a Gig
          </NavLink>
        </div>
      )}
    </div>
  );
}