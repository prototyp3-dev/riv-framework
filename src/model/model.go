package model

import (
  "fmt"
  "encoding/json"
  "encoding/base64"
)

type Cartridge struct {
  Id string
  UserAddress string
  Info map[string]interface{}
  CreatedAt uint64
  Cover []byte
  DataChunks *DataChunks
}
func (c Cartridge) MarshalJSON() ([]byte, error) {
  return json.Marshal(struct{
    Id string                   `json:"id"`
    UserAddress string          `json:"userAddress"`
    Info map[string]interface{} `json:"info"`
    CreatedAt uint64            `json:"createdAt"`
    Cover string                `json:"cover"`
  }{c.Id,c.UserAddress,c.Info,c.CreatedAt,base64.StdEncoding.EncodeToString(c.Cover)})
}


type Replay struct {
  CartridgeId string      `json:"cartridgeId"`
  User string             `json:"user"`
  UserAddress string      `json:"userAddress"`
  SubmittedAt uint64      `json:"submittedAt"`
  Args string             `json:"args"`
  OutCardHash []byte      `json:"outCardHash"`
  InCard []byte           `json:"inCard"`
  DataChunks *DataChunks  `json:"dataChunks"`
}

type DataChunks struct {
  ChunksData map[uint32]*Chunk
  TotalChunks uint32
}
func (dc DataChunks) MarshalJSON() ([]byte, error) {
  var size uint64
  var chunkIndexes []uint32
  for index, chunk := range dc.ChunksData {
    size += uint64(len(chunk.Data))
    chunkIndexes = append(chunkIndexes,index)
  }
  return json.Marshal(struct{
    TotalChunks uint32            `json:"totalChunks"`
    CurrentSize uint64            `json:"size"`
    Chunks []uint32               `json:"chunks"`
  }{TotalChunks:dc.TotalChunks,CurrentSize:size,Chunks:chunkIndexes})
}

type Chunk struct {
  Data []byte
}
func (c Chunk) String() string {
  return fmt.Sprintf("%db",len(c.Data))
}

type Status uint8

const (
  Success Status = iota
  ResultHashMismatch
  CartridgeNotFound
  CpuTimeExceeded
  Killed
  RuntimeError
  UnauthorizedUser
)

func (s Status) String() string {
	statuses := [...]string{"STATUS_SUCCESS","STATUS_CARTRIDGE_NOT_FOUND",
            "STATUS_CPU_TIME_EXCEEDED","STATUS_KILLED","STATUS_RUNTIME_ERROR","STATUS_UNAUTHORIZED_USER"}
	if len(statuses) < int(s) {
		return "STATUS_UNKNOWN"
	}
	return statuses[s]
}

func (s Status) MarshalJSON() ([]byte, error) {
  return json.Marshal(s.String())
}