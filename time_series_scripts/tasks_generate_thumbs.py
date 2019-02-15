import os
import sys
import glob
import json
import scipy.signal as signal
import numpy.ma as ma
import numpy as np
import matplotlib
import matplotlib.pylab as plt
import matplotlib.dates as mdates
import datetime
import statsmodels.api as sm

lowess = sm.nonparametric.lowess

def savitzky_golay(y, window_size, order, deriv=0, rate=1):
    r"""Smooth (and optionally differentiate) data with a Savitzky-Golay filter.
    The Savitzky-Golay filter removes high frequency noise from data.
    It has the advantage of preserving the original shape and
    features of the signal better than other types of filtering
    approaches, such as moving averages techniques.
    From http://scipy-cookbook.readthedocs.io/items/SavitzkyGolay.html
    Parameters
    ----------
    y : array_like, shape (N,)
        the values of the time history of the signal.
    window_size : int
        the length of the window. Must be an odd integer number.
    order : int
        the order of the polynomial used in the filtering.
        Must be less then `window_size` - 1.
    deriv: int
        the order of the derivative to compute (default = 0 means only smoothing)
    Returns
    -------
    ys : ndarray, shape (N)
        the smoothed signal (or it's n-th derivative).
    Notes
    -----
    The Savitzky-Golay is a type of low-pass filter, particularly
    suited for smoothing noisy data. The main idea behind this
    approach is to make for each point a least-square fit with a
    polynomial of high order over a odd-sized window centered at
    the point.
    Examples
    --------
    t = np.linspace(-4, 4, 500)
    y = np.exp( -t**2 ) + np.random.normal(0, 0.05, t.shape)
    ysg = savitzky_golay(y, window_size=31, order=4)
    import matplotlib.pyplot as plt
    plt.plot(t, y, label='Noisy signal')
    plt.plot(t, np.exp(-t**2), 'k', lw=1.5, label='Original signal')
    plt.plot(t, ysg, 'r', label='Filtered signal')
    plt.legend()
    plt.show()
    References
    ----------
    .. [1] A. Savitzky, M. J. E. Golay, Smoothing and Differentiation of
       Data by Simplified Least Squares Procedures. Analytical
       Chemistry, 1964, 36 (8), pp 1627-1639.
    .. [2] Numerical Recipes 3rd Edition: The Art of Scientific Computing
       W.H. Press, S.A. Teukolsky, W.T. Vetterling, B.P. Flannery
       Cambridge University Press ISBN-13: 9780521880688
    """
    import numpy as np
    from math import factorial
    
    try:
        window_size = np.abs(np.int(window_size))
        order = np.abs(np.int(order))
    except ValueError:
        raise ValueError("window_size and order have to be of type int")
    if window_size % 2 != 1 or window_size < 1:
        raise TypeError("window_size size must be a positive odd number")
    if window_size < order + 2:
        raise TypeError("window_size is too small for the polynomials order")
    order_range = range(order+1)
    half_window = (window_size -1) // 2
    # precompute coefficients
    b = np.mat([[k**i for i in order_range] for k in range(-half_window, half_window+1)])
    m = np.linalg.pinv(b).A[deriv] * rate**deriv * factorial(deriv)
    # pad the signal at the extremes with
    # values taken from the signal itself
    firstvals = y[0] - np.abs( y[1:half_window+1][::-1] - y[0] )
    lastvals = y[-1] + np.abs(y[-half_window-1:-1][::-1] - y[-1])
    y = np.concatenate((firstvals, y, lastvals))
    
    return np.convolve( m[::-1], y, mode='valid')



matplotlib.rcParams['font.size'] = 8

def process(f, i):
  path = 'time_series_images/' + os.path.basename(f) + '.png'
  if os.path.exists(path):
    print('Exists, skipping ...')
    return

  j = json.loads(open(f).read())

  p = j['features'][0]['properties']

  # fr = p['water_area_filled_fraction']

  t = p['water_area_time']
  v1 = p['water_area_value']
  v2 = p['water_area_filled']

  t_jrc = p['water_area_time_jrc']
  v_jrc = p['water_area_value_jrc']

  filled_fr = list(zip(v1, v2))
  filled_fr = [(o[1]-o[0])/o[1] for o in filled_fr]

  mask = ma.masked_greater_equal(filled_fr, 0.5)

  # t = list(ma.masked_array(t, mask).compressed())
  # v1 = list(ma.masked_array(v1, mask).compressed())
  # v2 = list(ma.masked_array(v2, mask).compressed())

  if not len(t):
    print('Empty, skipping ...')
    return

  years = mdates.YearLocator()   # every year


  v2_filtered = savitzky_golay(np.array(v2), window_size=15, order=4)
  # v2_filtered = signal.medfilt(v2, 7)
  # v2_filtered = lowess(v2, t)
  # v2_filtered = lowess(v2, t, frac=1./50)

  t = [datetime.datetime.fromtimestamp(tt / 1000) for tt in t]
  t_jrc = [datetime.datetime.fromtimestamp(tt_jrc / 1000) for tt_jrc in t_jrc]

  s_scale = 'Scale: {:.2f}'.format(p['scale']) + '$m$'
  s_area = 'Area: {:.2f}'.format(p['area']/(1000*1000)) + '$km^2$, ' + '{:.2f}'.format(100 * p['area']/(1000*1000)) + '$ha$'
  title = s_scale + ', ' + s_area

  fig = plt.figure(figsize=(11, 4))
  ax = fig.add_subplot(111)
  ax.xaxis.set_major_locator(years)

  # fig.autofmt_xdate()
  ax.set_xlim([datetime.date(1985, 1, 1), datetime.date(2019, 1, 1)])

  ax.grid(color='k', linestyle='-', linewidth=1, alpha=0.2)

  plt.title(title)

  plt.xticks(rotation=90)

  ax.plot(t_jrc, v_jrc, marker='.', c='r', markersize=2, linewidth=0, alpha=0.05)

  ax.plot(t, v1, marker='.', c='b', markersize=2, linewidth=0, alpha=0.05)

  ax.plot(t, v2, marker='.', c='k', markersize=3, linewidth=0, alpha=0.8)

  # for SG
  if len(t) != len(v2_filtered):
    print('Bad, shapes are not equal, skipping line plotting ...')
  else:
    ax.plot(t, v2_filtered, marker='.', c='k', markersize=0, linewidth=2, alpha=0.1)

  # for LOWESS
  # v2_filtered_t = [datetime.datetime.fromtimestamp(t / 1000) for t in v2_filtered[:, 0]]
  # ax.plot(v2_filtered_t, v2_filtered[:, 1], marker='.', c='k', markersize=0, linewidth=2, alpha=0.1)

  path = 'time_series_images/' + os.path.basename(f) + '.png'
  print(str(i) + ' ' + path)
  plt.tight_layout()
  plt.savefig(path, dpi=150)
  plt.close()

  # ========================== JRC

  # fig = plt.figure(figsize=(11, 4))
  # ax = fig.add_subplot(111)
  # ax.xaxis.set_major_locator(years)

  # ax.set_xlim([datetime.date(1985, 1, 1), datetime.date(2019, 1, 1)])

  # ax.grid(color='k', linestyle='-', linewidth=1, alpha=0.2)

  # plt.title(title)

  # plt.xticks(rotation=90)

  # ax.plot(t_jrc, v_jrc, marker='.', c='r', markersize=2, linewidth=0, alpha=0.8)

  # ax.plot(t, v1, marker='.', c='b', markersize=2, linewidth=0, alpha=0.05)

  # ax.plot(t, v2, marker='.', c='k', markersize=3, linewidth=0, alpha=0.05)

  # for SG
  # if len(t) != len(v2_filtered):
  #   print('Bad, shapes are not equal, skipping line plotting ...')
  # else:
  #   ax.plot(t, v2_filtered, marker='.', c='k', markersize=0, linewidth=2, alpha=0.1)

  # path = 'time_series_images/' + os.path.basename(f) + '-jrc.png'
  # print(str(i) + ' ' + path)
  # plt.tight_layout()
  # plt.savefig(path, dpi=150)
  # plt.close()

offset = 0

for (i, f) in enumerate(glob.glob('time_series/*.geojson')[offset:]):
  print('Processing ' + str(i) + ' ...')

  process(f, i + offset)


