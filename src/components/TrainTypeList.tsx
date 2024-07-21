import React, { useCallback, useMemo } from 'react'
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilValue } from 'recoil'
import { Line, TrainType } from '../../gen/proto/stationapi_pb'
import { currentLineSelector } from '../store/selectors/currentLine'
import { isLEDSelector } from '../store/selectors/isLED'
import { isJapanese } from '../translation'
import Typography from './Typography'

const styles = StyleSheet.create({
  cell: { padding: 12 },
  stationNameText: {
    fontSize: RFValue(14),
  },
  descriptionText: {
    fontSize: RFValue(11),
    marginTop: 8,
  },
  separator: { height: 1, width: '100%', backgroundColor: '#aaa' },
})

const Separator = () => <View style={styles.separator} />

const ItemCell = ({
  item,
  onSelect,
}: {
  item: TrainType
  onSelect: (item: TrainType) => void
}) => {
  const currentLine = useRecoilValue(currentLineSelector)

  const lines = useMemo(
    () =>
      item.lines.reduce<Line[]>((acc, cur) => {
        if (!acc || acc.every((l) => l.nameShort !== cur.nameShort)) {
          return [...acc, cur]
        }

        return acc
      }, []),
    [item.lines]
  )

  const isEveryLineSameType = useMemo(
    () =>
      lines.every((l) => {
        const first = lines[0]
        return l.trainType?.typeId === first.trainType?.typeId
      }),
    [lines]
  )

  if (lines.length === 1) {
    return (
      <TouchableOpacity style={styles.cell} onPress={() => onSelect(item)}>
        <Typography style={styles.stationNameText}>
          {isJapanese
            ? item.name
            : `${currentLine?.nameRoman} ${item.nameRoman}`}
        </Typography>
        <Typography style={styles.descriptionText}>直通運転なし</Typography>
      </TouchableOpacity>
    )
  }

  if (isEveryLineSameType) {
    return (
      <TouchableOpacity style={styles.cell} onPress={() => onSelect(item)}>
        <Typography style={styles.stationNameText}>
          {isJapanese
            ? item.name
            : `${currentLine?.nameRoman} ${item.nameRoman}`}
        </Typography>
        <Typography style={styles.descriptionText}>
          {isJapanese
            ? lines
                .filter((l) => l.id !== currentLine?.id)
                .map((l) => l.nameShort)
                .join('・')
            : lines.map((l) => l.nameRoman).join(', ')}
          直通
        </Typography>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity style={styles.cell} onPress={() => onSelect(item)}>
      <Typography style={styles.stationNameText}>
        {isJapanese ? item.name : item.nameRoman}
      </Typography>
      <Typography style={styles.descriptionText}>
        {isJapanese
          ? lines
              .filter((l) => l.id !== currentLine?.id)
              .map((l) => `${l.nameShort}${l.trainType?.name ?? ''}`)
              .join('・')
          : lines
              .map(
                (l) =>
                  `${l.nameRoman}${
                    l.trainType?.nameRoman ? ` ${l.trainType.nameRoman}` : ''
                  }`
              )
              .join(', ')}
      </Typography>
    </TouchableOpacity>
  )
}

export const TrainTypeList = ({
  data,
  onSelect,
}: {
  data: TrainType[]
  onSelect: (item: TrainType) => void
}) => {
  const isLEDTheme = useRecoilValue(isLEDSelector)

  const renderItem = useCallback(
    ({ item }: { item: TrainType; index: number }) => {
      return <ItemCell item={item} onSelect={onSelect} />
    },
    [onSelect]
  )

  const keyExtractor = useCallback((item: TrainType) => item.id.toString(), [])

  return (
    <FlatList
      initialNumToRender={data.length}
      style={{
        borderColor: isLEDTheme ? '#fff' : '#aaa',
        borderWidth: 1,
        flex: 1,
        marginVertical: 24,
      }}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={Separator}
    />
  )
}
