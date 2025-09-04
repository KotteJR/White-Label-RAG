"use client";

import React from "react";

interface TableData {
  title?: string;
  headers: string[];
  rows: (string | number)[][];
  caption?: string;
}

export default function TableRenderer({ tableData }: { tableData: TableData }) {
  const { title, headers, rows, caption } = tableData;

  return (
    <div className="my-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, index) => (
                <th 
                  key={index} 
                  className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 text-sm"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className="hover:bg-gray-50 transition-colors"
              >
                {row.map((cell, cellIndex) => (
                  <td 
                    key={cellIndex} 
                    className="border-b border-gray-100 px-4 py-3 text-gray-800"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <p className="text-sm text-gray-600 mt-2 text-center italic">{caption}</p>
      )}
    </div>
  );
}
