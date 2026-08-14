import React, { useEffect, useRef } from 'react'
import { getStyle } from '@coreui/utils'
import { CChart } from '@coreui/react-chartjs'
import { CCard, CCardBody } from '@coreui/react-pro'
import '../styles/reportStyles.css'

const BarsSummary = ({ data, chartTitle }: { data: any, chartTitle: string }) => {
  const chartRef = useRef<any>(null)

  useEffect(() => {
    const handleColorSchemeChange = () => {
      const chartInstance = chartRef.current

      if (chartInstance) {
        const { options } = chartInstance

        if (options.plugins?.legend?.labels) {
          options.plugins.legend.labels.color = getStyle('--cui-body-color')
        }

        if (options.plugins?.datalabels) {
          options.plugins.datalabels.color = getStyle('--cui-body-color')
        }

        if (options.scales?.x) {
          if (options.scales.x.grid) {
            options.scales.x.grid.color = getStyle('--cui-border-color-translucent')
          }

          if (options.scales.x.ticks) {
            options.scales.x.ticks.color = getStyle('--cui-body-color')
          }
        }

        if (options.scales?.y) {
          if (options.scales.y.grid) {
            options.scales.y.grid.color = getStyle('--cui-border-color-translucent')
          }

          if (options.scales.y.ticks) {
            options.scales.y.ticks.color = getStyle('--cui-body-color')
          }
        }

        chartInstance.update()
      }
    }

    document.documentElement.addEventListener('ColorSchemeChange', handleColorSchemeChange)

    return () => {
      document.documentElement.removeEventListener('ColorSchemeChange', handleColorSchemeChange)
    }
  }, [])

  const options = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      top: 20,
    },
  },
  plugins: {
  title: {
    display: true,
    text: chartTitle,
    color: getStyle('--cui-body-color'),
    font: {
      size: 13,
      weight: 'bold',
    },
    padding: {
      bottom: 10,
    },
  },

  legend: {
    display: false,
  },

  datalabels: {
    anchor: 'end',
    align: 'top',
    offset: 4,
    color: getStyle('--cui-body-color'),
    font: {
      weight: 'bold',
      size: 10,
    },
    formatter: (value: number) => value,
    clip: false,
  },
},
  scales: {
    x: {
      grid: {
        color: getStyle('--cui-border-color-translucent'),
      },
      ticks: {
        color: getStyle('--cui-body-color'),
      },
      type: 'category',
    },
    y: {
      beginAtZero: true,
      grace: '20%',
      ticks: {
        precision: 0,
        color: getStyle('--cui-body-color'),
      },
    },
  },
  
}

  const barValuePlugin = {
  id: 'barValuePlugin',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart

    ctx.save()
    ctx.font = 'bold 12px Arial'
    ctx.fillStyle = getStyle('--cui-body-color') || '#000'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'

    chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
      const meta = chart.getDatasetMeta(datasetIndex)

      meta.data.forEach((bar: any, index: number) => {
        const value = dataset.data[index]

        if (value !== null && value !== undefined && value !== 0) {
          ctx.fillText(String(value), bar.x, bar.y - 4)
        }
      })
    })

    ctx.restore()
  },
}

  return (
    <div className="chart-wrapper">
          <div style={{ height: '200px', width: '100%' }}>
            <CChart
              type="bar"
              data={data}
              options={options}
              plugins={[barValuePlugin]}
              ref={chartRef}
            />
          </div>
    </div>
  )
}

export default BarsSummary;