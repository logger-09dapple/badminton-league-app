import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { TrendingUp, BarChart3, PieChart, Activity } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const ChartsAndGraphs = ({ 
  performanceTrends, 
  eloDistribution, 
  skillDistribution, 
  headToHeadData,
  competitivenessData,
  type = 'performance',
  selectedPlayerName = '',
  comparePlayerName = '',
  selectedTeamName = ''
}) => {
  
  // Chart options for consistent styling
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  // Performance Trends Chart - Enhanced
  const PerformanceTrendChart = () => {
    if (!performanceTrends || performanceTrends.length === 0) {
      return (
        <div className="chart-placeholder">
          <p>No completed matches found for performance analysis</p>
        </div>
      );
    }

    const data = {
      labels: performanceTrends.map(trend => {
        const date = new Date(trend.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        return `${date}: ${trend.team1Name} vs ${trend.team2Name}`;
      }),
      datasets: [
        {
          label: 'Win Rate %',
          data: performanceTrends.map(trend => trend.winRate),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          yAxisID: 'y',
        },
        {
          label: 'Points Scored',
          data: performanceTrends.map(trend => trend.pointsScored),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.3,
          yAxisID: 'y1',
        },
      ],
    };

    // Add ELO rating if available
    if (performanceTrends.some(trend => trend.eloRating !== null)) {
      data.datasets.push({
        label: 'ELO Rating',
        data: performanceTrends.map(trend => trend.eloRating),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.3,
        yAxisID: 'y2',
      });
    }

    const options = {
      ...chartOptions,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        ...chartOptions.plugins,
        tooltip: {
          callbacks: {
            title: function(tooltipItems) {
              const index = tooltipItems[0].dataIndex;
              const trend = performanceTrends[index];
              return `Match ${index + 1}: ${trend.team1Name} ${trend.team1Score} - ${trend.team2Score} ${trend.team2Name}`;
            },
            afterTitle: function(tooltipItems) {
              const index = tooltipItems[0].dataIndex;
              const trend = performanceTrends[index];
              const date = new Date(trend.date).toLocaleDateString();
              return `Date: ${date} | Result: ${trend.isWin ? 'WIN' : 'LOSS'}`;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            callback: function(value, index) {
              // Show shorter labels on x-axis
              const trend = performanceTrends[index];
              if (!trend) return '';
              return `Match ${index + 1}`;
            }
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Win Rate %'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Points Scored'
          },
          grid: {
            drawOnChartArea: false,
          },
        },
        y2: {
          type: 'linear',
          display: false,
          position: 'right',
        }
      },
    };

    return (
      <div className="chart-container">
        <div className="chart-header">
          <TrendingUp size={20} />
          <h3>Performance Trends - {selectedPlayerName || selectedTeamName || 'Player/Team'}</h3>
          <p className="chart-subtitle">{performanceTrends.length} completed matches</p>
        </div>
        <div className="chart-wrapper">
          <Line data={data} options={options} />
        </div>
        <div className="chart-stats">
          <div className="stat-item">
            <span className="stat-label">Total Matches:</span>
            <span className="stat-value">{performanceTrends.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Win Rate:</span>
            <span className="stat-value">{performanceTrends[performanceTrends.length - 1]?.winRate.toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg Points:</span>
            <span className="stat-value">{performanceTrends[performanceTrends.length - 1]?.averagePoints.toFixed(1)}</span>
          </div>
          {performanceTrends[performanceTrends.length - 1]?.eloRating && (
            <div className="stat-item">
              <span className="stat-label">Current ELO:</span>
              <span className="stat-value">{performanceTrends[performanceTrends.length - 1]?.eloRating}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ELO Distribution Chart
  const EloDistributionChart = () => {
    if (!eloDistribution || !eloDistribution.ranges) {
      return <div className="chart-placeholder">No ELO data available</div>;
    }

    const data = {
      labels: Object.keys(eloDistribution.ranges),
      datasets: [
        {
          label: 'Number of Players',
          data: Object.values(eloDistribution.ranges),
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)',
          ],
          borderColor: [
            'rgba(239, 68, 68, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(139, 92, 246, 1)',
            'rgba(236, 72, 153, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };

    return (
      <div className="chart-container">
        <div className="chart-header">
          <BarChart3 size={20} />
          <h3>ELO Rating Distribution</h3>
        </div>
        <div className="chart-wrapper">
          <Bar data={data} options={chartOptions} />
        </div>
        <div className="chart-stats">
          <div className="stat-item">
            <span className="stat-label">Average:</span>
            <span className="stat-value">{Math.round(eloDistribution.average || 1500)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Median:</span>
            <span className="stat-value">{Math.round(eloDistribution.median || 1500)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Std Dev:</span>
            <span className="stat-value">{Math.round(eloDistribution.standardDeviation || 0)}</span>
          </div>
        </div>
      </div>
    );
  };

  // Skill Level Distribution Chart
  const SkillDistributionChart = () => {
    if (!skillDistribution) {
      return <div className="chart-placeholder">No skill data available</div>;
    }

    const labels = [];
    const dataValues = [];
    const backgroundColors = [];
    const borderColors = [];

    // Define colors for each skill level
    const colorMap = {
      beginner: { bg: 'rgba(16, 185, 129, 0.8)', border: 'rgba(16, 185, 129, 1)' },
      intermediate: { bg: 'rgba(59, 130, 246, 0.8)', border: 'rgba(59, 130, 246, 1)' },
      advanced: { bg: 'rgba(245, 158, 11, 0.8)', border: 'rgba(245, 158, 11, 1)' },
      unspecified: { bg: 'rgba(156, 163, 175, 0.8)', border: 'rgba(156, 163, 175, 1)' }
    };

    // Add data for each skill level that has players
    Object.entries(skillDistribution).forEach(([skill, count]) => {
      if (count > 0) {
        labels.push(skill.charAt(0).toUpperCase() + skill.slice(1));
        dataValues.push(count);
        backgroundColors.push(colorMap[skill]?.bg || 'rgba(107, 114, 128, 0.8)');
        borderColors.push(colorMap[skill]?.border || 'rgba(107, 114, 128, 1)');
      }
    });

    // If no data, show placeholder
    if (dataValues.length === 0) {
      return <div className="chart-placeholder">No skill level data available</div>;
    }
    const data = {
      labels,
      datasets: [
        {
          data: dataValues,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2,
        },
      ],
    };

    return (
      <div className="chart-container">
        <div className="chart-header">
          <PieChart size={20} />
          <h3>Skill Level Distribution</h3>
          <p className="chart-subtitle">{dataValues.reduce((sum, val) => sum + val, 0)} total players</p>
        </div>
        <div className="chart-wrapper">
          <Doughnut data={data} options={doughnutOptions} />
        </div>
        <div className="chart-stats">
          {labels.map((label, index) => (
            <div key={label} className="stat-item">
              <span className="stat-label">{label}:</span>
              <span className="stat-value">{dataValues[index]} players</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Head-to-Head Comparison Chart - Enhanced
  const HeadToHeadChart = () => {
    if (!headToHeadData || headToHeadData.totalMatches === 0) {
      return (
        <div className="chart-placeholder">
          <p>No head-to-head matches found between selected players</p>
          <p>Select two players who have played against each other</p>
        </div>
      );
    }

    const player1Name = selectedPlayerName || 'Player 1';
    const player2Name = comparePlayerName || 'Player 2';

    const data = {
      labels: [`${player1Name} Wins`, `${player2Name} Wins`],
      datasets: [
        {
          label: 'Head-to-Head Results',
          data: [headToHeadData.entity1Wins, headToHeadData.entity2Wins],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };

    return (
      <div className="chart-container">
        <div className="chart-header">
          <Activity size={20} />
          <h3>Head-to-Head: {player1Name} vs {player2Name}</h3>
        </div>
        <div className="chart-wrapper">
          <Bar data={data} options={chartOptions} />
        </div>
        <div className="chart-stats">
          <div className="stat-item">
            <span className="stat-label">Total Matches:</span>
            <span className="stat-value">{headToHeadData.totalMatches}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{player1Name} Win Rate:</span>
            <span className="stat-value">{headToHeadData.entity1WinRate.toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{player2Name} Win Rate:</span>
            <span className="stat-value">{headToHeadData.entity2WinRate.toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{player1Name} Avg Points:</span>
            <span className="stat-value">{headToHeadData.averagePointsEntity1.toFixed(1)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{player2Name} Avg Points:</span>
            <span className="stat-value">{headToHeadData.averagePointsEntity2.toFixed(1)}</span>
          </div>
        </div>
      </div>
    );
  };

  // Competitiveness Chart
  const CompetitivenessChart = () => {
    if (!competitivenessData || competitivenessData.length === 0) {
      return <div className="chart-placeholder">No competitiveness data available</div>;
    }

    const data = {
      labels: competitivenessData.map(d => d.label),
      datasets: [
        {
          label: 'Competitiveness Score',
          data: competitivenessData.map(d => d.value),
          backgroundColor: 'rgba(139, 92, 246, 0.8)',
          borderColor: 'rgba(139, 92, 246, 1)',
          borderWidth: 2,
        },
      ],
    };

    return (
      <div className="chart-container">
        <div className="chart-header">
          <Activity size={20} />
          <h3>League Competitiveness</h3>
        </div>
        <div className="chart-wrapper">
          <Bar data={data} options={chartOptions} />
        </div>
      </div>
    );
  };

  // Render different chart types based on props
  const renderChart = () => {
    switch (type) {
      case 'performance':
        return <PerformanceTrendChart />;
      case 'elo':
        return <EloDistributionChart />;
      case 'skills':
        return <SkillDistributionChart />;
      case 'headtohead':
        return <HeadToHeadChart />;
      case 'competitiveness':
        return <CompetitivenessChart />;
      default:
        return <PerformanceTrendChart />;
    }
  };

  return (
    <div className="charts-container">
      {renderChart()}
    </div>
  );
};

export default ChartsAndGraphs;